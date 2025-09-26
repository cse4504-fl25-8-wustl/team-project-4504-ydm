import { IdGenerator } from "../../../lib/id";
import getCatalogs, { BoxType, CrateType, PalletType } from "../data/getCatalogs";
import { PackInputDTO, MATERIAL_WEIGHTS, MaterialType } from "./dto/PackInputDTO";
import { determineMaterialType } from "./validate";
import { PackedBox, PackedItemReference } from "./entities/Box";
import { PackedContainer, PackedCrate, PackedPallet, PalletCategory } from "./entities/Container";
import { GroupedItem, ItemGrouping, ManualHandlingInfo, ProcessedItem } from "./entities/Item";
import { ManualHandlingItem, PackingMetrics, PackingPlan } from "./entities/Output";
import STANDARD_PROFILE from "../rules/profiles/standard";
import { OversizeClass, PackingRuleProfile, RuleContext } from "../rules/archRules";

interface CatalogData {
  boxes: BoxType[];
  pallets: PalletType[];
  crates: CrateType[];
}

const PALLET_CAPACITY: Record<PalletCategory, Record<string, number>> = {
  "glass-small": { standard: 2, large: 2 },
  standard: { standard: 4, large: 3 },
  oversize: { standard: 5, large: 4 },
};

const PALLET_TARE_WEIGHT: Record<PalletCategory, number> = {
  "glass-small": 60,
  standard: 60,
  oversize: 75,
};

const DEFAULT_MANUAL_ACTION = "Needs manual handling";

export interface PackingEngineResult {
  plan: PackingPlan;
  warnings: string[];
  manualHandlingItems: ManualHandlingItem[];
}

export function buildPackingPlan(
  input: PackInputDTO,
  profile: PackingRuleProfile = STANDARD_PROFILE,
  catalogs: CatalogData = getCatalogs()
): PackingEngineResult {
  const context: RuleContext = {
    clientName: input.clientName,
    deliveryCapabilities: input.deliveryCapabilities,
  };

  const processedItems = input.items.map((item) =>
    createProcessedItem(item, profile)
  );

  const manualHandlingItems: ManualHandlingItem[] = processedItems
    .filter((item) => item.manualHandling.required)
    .map((item) => ({
      item,
      reason: item.manualHandling.reason ?? "Manual handling required",
      recommendedAction: item.manualHandling.recommendedAction ?? DEFAULT_MANUAL_ACTION,
    }));

  const eligibleItems = processedItems.filter((item) => !item.manualHandling.required);

  const groupings = groupItems(eligibleItems);
  const boxes = allocateBoxes(groupings, profile, context, catalogs);
  const { pallets, crates, warnings } = buildContainers(boxes, profile, context, catalogs);

  const metrics = deriveMetrics(eligibleItems, boxes, [...pallets, ...crates]);

  const plan: PackingPlan = {
    items: processedItems,
    boxes,
    containers: [...pallets, ...crates],
    manualHandlingItems,
    warnings: [...profile.getRuleWarnings(), ...warnings],
    advisoryNotes: [],
    metrics,
  };

  return {
    plan,
    warnings: plan.warnings,
    manualHandlingItems,
  };
}

function createProcessedItem(
  inputItem: PackInputDTO["items"][number],
  profile: PackingRuleProfile
): ProcessedItem {
  const materialType = determineMaterialType(inputItem.finalMedium, inputItem.glazing);
  const weightPerSqIn = MATERIAL_WEIGHTS[materialType];
  const width = inputItem.outsideSizeWidth;
  const height = inputItem.outsideSizeHeight;
  const defaultDepth = profile.getDefaultDepthInches({} as ProcessedItem);
  const area = width * height;
  const rawPieceWeight = area * weightPerSqIn;
  const pieceWeight = Math.ceil(rawPieceWeight);
  const totalWeight = Math.ceil(pieceWeight * inputItem.quantity);

  const containsGlass = (inputItem.glazing ?? "").toLowerCase().includes("glass");
  const flags = {
    isOversized: width > 36 || height > 36,
    requiresLargeBox: width > 36 || height > 36,
    requiresCrate: width > 46 || height > 46,
    containsGlass,
    isWallDecor: inputItem.finalMedium.toLowerCase().includes("wall decor"),
    isTactilePanel: inputItem.finalMedium.toLowerCase().includes("tactile"),
    isRaisedFloatMount: inputItem.finalMedium.toLowerCase().includes("float"),
  };

  const placeholderItem: ProcessedItem = {
    id: IdGenerator.generateItemId(),
    lineNumber: inputItem.lineNumber,
    tagNumber: inputItem.tagNumber,
    finalMedium: inputItem.finalMedium,
    glazing: inputItem.glazing,
    hardware: inputItem.hardware,
    quantity: inputItem.quantity,
    materialType,
    dimensions: {
      width,
      height,
      depth: defaultDepth,
    },
    pieceWeight,
    totalWeight,
    flags,
    manualHandling: { required: false },
    wallDecorPieces: undefined,
    notes: [],
  };

  const manualHandling = profile.evaluateManualHandling(placeholderItem);

  const notes: string[] = [];
  if (flags.isWallDecor) {
    notes.push("Wall decor item flagged for installation summary");
  }
  if (flags.isTactilePanel) {
    notes.push("Tactile panel requires special handling flag");
  }
  if (flags.isRaisedFloatMount) {
    notes.push("Raised float mount flagged for depth review");
  }
  if (manualHandling.required && manualHandling.reason) {
    notes.push(manualHandling.reason);
  }

  const wallDecorPieces = inferWallDecorPieces(inputItem, placeholderItem);

  return {
    ...placeholderItem,
    manualHandling,
    notes,
    wallDecorPieces,
  };
}

function inferWallDecorPieces(
  inputItem: PackInputDTO["items"][number],
  item: ProcessedItem
): number | undefined {
  if (!item.flags.isWallDecor) {
    return undefined;
  }
  const maybePieces = (inputItem as unknown as { piecesPerSet?: number }).piecesPerSet;
  if (typeof maybePieces === "number" && maybePieces > 0) {
    return maybePieces * inputItem.quantity;
  }
  return undefined;
}

function groupItems(items: ProcessedItem[]): ItemGrouping[] {
  const groups = new Map<string, ItemGrouping>();

  for (const item of items) {
    const allocationType = item.flags.requiresLargeBox ? "large" : "standard";
    const key = [
      item.materialType,
      allocationType,
      item.flags.containsGlass ? "glass" : "no-glass",
    ].join("|");

    const grouping = groups.get(key);
    const groupedItem: GroupedItem = {
      item,
      quantity: item.quantity,
      totalWeight: item.totalWeight,
    };

    if (grouping) {
      grouping.items.push(groupedItem);
    } else {
      groups.set(key, {
        key,
        items: [groupedItem],
        materialType: item.materialType,
        flags: item.flags,
      });
    }
  }

  return Array.from(groups.values());
}

function allocateBoxes(
  groupings: ItemGrouping[],
  profile: PackingRuleProfile,
  context: RuleContext,
  catalogs: CatalogData
): PackedBox[] {
  const boxes: PackedBox[] = [];

  for (const grouping of groupings) {
    const piecesPerBox = profile.getPiecesPerBox(grouping.materialType, context);
    const allocationType = grouping.flags.requiresLargeBox ? "large" : "standard";
    const catalogType = catalogs.boxes.find((box) => box.id === allocationType);
    if (!catalogType) {
      throw new Error(`Catalog does not define box type: ${allocationType}`);
    }

    let currentPieces = 0;
    let currentWeight = 0;
    let allocated: PackedItemReference[] = [];
    let totalPieces = 0;

    const flushBox = () => {
      if (currentPieces === 0) {
        return;
      }
      const boxId = IdGenerator.generateBoxId();
      const totalWeight = Math.ceil(currentWeight + catalogType.weight);
      boxes.push({
        id: boxId,
        catalogType,
        allocationType,
        primaryMaterial: grouping.materialType,
        containsGlass: grouping.flags.containsGlass,
        items: allocated,
        totalPieces,
        contentWeight: Math.ceil(currentWeight),
        tareWeight: catalogType.weight,
        totalWeight,
        requiresCrate: grouping.flags.requiresCrate,
        requiresGlassPallet: grouping.flags.containsGlass,
        heightInches: catalogType.dimensions.height,
        widthInches: catalogType.dimensions.width,
        lengthInches: catalogType.dimensions.length,
        notes: grouping.flags.containsGlass ? ["Contains glass glazing"] : [],
      });
      currentPieces = 0;
      currentWeight = 0;
      allocated = [];
      totalPieces = 0;
    };

    for (const groupedItem of grouping.items) {
      let remaining = groupedItem.quantity;
      const pieceWeight = Math.ceil(groupedItem.totalWeight / groupedItem.quantity);
      while (remaining > 0) {
        const space = piecesPerBox - currentPieces;
        const allocation = Math.min(space, remaining);
        allocated.push({
          groupedItem,
          allocatedQuantity: allocation,
          allocatedWeight: Math.ceil(pieceWeight * allocation),
        });
        currentPieces += allocation;
        totalPieces += allocation;
        currentWeight += pieceWeight * allocation;
        remaining -= allocation;

        if (currentPieces >= piecesPerBox) {
          flushBox();
        }
      }
    }

    flushBox();
  }

  return boxes;
}

function buildContainers(
  boxes: PackedBox[],
  profile: PackingRuleProfile,
  context: RuleContext,
  catalogs: CatalogData
): {
  pallets: PackedPallet[];
  crates: PackedCrate[];
  warnings: string[];
} {
  const crates: PackedCrate[] = [];
  const pallets: PackedPallet[] = [];
  const warnings: string[] = [];

  const crateCandidates: PackedBox[] = [];
  const palletCandidates: PackedBox[] = [];

  for (const box of boxes) {
    const oversizeClass: OversizeClass = box.allocationType === "large" ? "oversize" : "standard";
    const crateCapacity = profile.resolveCrateCapacity(box.primaryMaterial, oversizeClass);
    if (profile.shouldRouteBoxesToCrate(context) && crateCapacity) {
      crateCandidates.push(box);
    } else {
      palletCandidates.push(box);
    }
  }

  crates.push(...allocateCrates(crateCandidates, catalogs, profile));
  pallets.push(...allocatePallets(palletCandidates, catalogs, warnings));

  return { crates, pallets, warnings };
}

function allocateCrates(
  boxes: PackedBox[],
  catalogs: CatalogData,
  profile: PackingRuleProfile
): PackedCrate[] {
  const crates: PackedCrate[] = [];
  if (boxes.length === 0) {
    return crates;
  }

  const standardCrate = catalogs.crates.find((crate) => crate.id === "standard");
  const customCrate = catalogs.crates.find((crate) => crate.id === "custom");
  if (!standardCrate && !customCrate) {
    throw new Error("Crate catalog data is missing");
  }

  const byKey = new Map<string, { boxes: PackedBox[]; capacity: number; crate: CrateType }>();

  for (const box of boxes) {
    const oversizeClass: OversizeClass = box.allocationType === "large" ? "oversize" : "standard";
    const capacityResult = profile.resolveCrateCapacity(box.primaryMaterial, oversizeClass);
    if (!capacityResult) {
      continue;
    }

    const crateProfile = oversizeClass === "oversize" ? customCrate ?? standardCrate! : standardCrate ?? customCrate!;
    const key = `${box.primaryMaterial}|${oversizeClass}|${crateProfile.id}`;
    const entry = byKey.get(key) ?? { boxes: [], capacity: capacityResult.piecesPerCrate, crate: crateProfile };
    entry.boxes.push(box);
    byKey.set(key, entry);
  }

  for (const { boxes: groupedBoxes, capacity, crate } of byKey.values()) {
    let current: PackedBox[] = [];
    let currentPieces = 0;

    for (const box of groupedBoxes) {
      if (currentPieces + box.totalPieces > capacity) {
        crates.push(buildCrate(current, crate));
        current = [];
        currentPieces = 0;
      }
      current.push(box);
      currentPieces += box.totalPieces;
    }

    if (current.length > 0) {
      crates.push(buildCrate(current, crate));
    }
  }

  return crates;
}

function buildCrate(boxes: PackedBox[], crateProfile: CrateType): PackedCrate {
  const crateId = IdGenerator.generateCrateId();
  const contentWeight = boxes.reduce((sum, box) => sum + box.totalWeight, 0);
  const totalWeight = Math.ceil(contentWeight + crateProfile.weight);
  const length = Math.max(...boxes.map((box) => box.lengthInches), crateProfile.baseDimensions.length);
  const width = Math.max(...boxes.map((box) => box.widthInches), crateProfile.baseDimensions.width);
  const height = Math.max(...boxes.map((box) => box.heightInches)) + 8;
  const warnings: string[] = [];

  if (height > 102) {
    warnings.push("Crate height exceeds 102\" limit; engineer custom crate.");
  } else if (height > 84) {
    warnings.push("Crate height exceeds 84\" recommendation.");
  }

  return {
    id: crateId,
    kind: "crate",
    crateProfile,
    category: crateProfile.id === "standard" ? "standard" : "custom",
    boxes,
    contentWeight: Math.ceil(contentWeight),
    tareWeight: crateProfile.weight,
    totalWeight,
    warnings,
    dimensions: { length, width, height },
  };
}

function allocatePallets(
  boxes: PackedBox[],
  catalogs: CatalogData,
  warnings: string[]
): PackedPallet[] {
  const pallets: PackedPallet[] = [];
  const standardPallet = catalogs.pallets.find((pallet) => pallet.id === "standard");
  const glassPallet = catalogs.pallets.find((pallet) => pallet.id === "glass-small");
  const oversizePallet = catalogs.pallets.find((pallet) => pallet.id === "oversize");

  if (!standardPallet || !glassPallet || !oversizePallet) {
    throw new Error("Pallet catalog data is incomplete");
  }

  const glassBoxes = boxes.filter((box) => box.containsGlass);
  const otherBoxes = boxes.filter((box) => !box.containsGlass);

  pallets.push(...loadPalletCategory(glassBoxes, glassPallet, "glass-small"));

  const standardBoxes = otherBoxes.filter((box) => box.allocationType === "standard");
  const largeBoxes = otherBoxes.filter((box) => box.allocationType === "large");

  pallets.push(...loadPalletCategory(standardBoxes, standardPallet, "standard"));
  pallets.push(...loadPalletCategory(largeBoxes, oversizePallet, "oversize"));

  return pallets;
}

function loadPalletCategory(
  boxes: PackedBox[],
  profile: PalletType,
  category: PalletCategory
): PackedPallet[] {
  if (boxes.length === 0) {
    return [];
  }

  const capacityMap = PALLET_CAPACITY[category];
  const capacityKey = boxes[0].allocationType;
  const capacity = capacityMap[capacityKey] ?? capacityMap.standard;
  const pallets: PackedPallet[] = [];
  let current: PackedBox[] = [];

  const flush = () => {
    if (current.length === 0) {
      return;
    }
    pallets.push(buildPallet(current, profile, category));
    current = [];
  };

  for (const box of boxes) {
    current.push(box);
    if (current.length >= capacity) {
      flush();
    }
  }

  flush();
  return pallets;
}

function buildPallet(
  boxes: PackedBox[],
  profile: PalletType,
  category: PalletCategory
): PackedPallet {
  const palletId = IdGenerator.generatePalletId();
  const contentWeight = boxes.reduce((sum, box) => sum + box.totalWeight, 0);
  const tareWeight = PALLET_TARE_WEIGHT[category];
  const totalWeight = Math.ceil(contentWeight + tareWeight);
  const height = Math.max(...boxes.map((box) => box.heightInches)) + 8;
  const warnings: string[] = [];

  if (height > 102) {
    warnings.push("Pallet height exceeds 102\" limit; split required.");
  } else if (height > 84) {
    warnings.push("Pallet height exceeds 84\" recommendation.");
  }

  return {
    id: palletId,
    kind: "pallet",
    palletProfile: profile,
    category,
    boxes,
    contentWeight: Math.ceil(contentWeight),
    tareWeight,
    totalWeight,
    warnings,
    dimensions: {
      length: profile.dimensions.length,
      width: profile.dimensions.width,
      height,
    },
  };
}

function deriveMetrics(
  items: ProcessedItem[],
  boxes: PackedBox[],
  containers: PackedContainer[]
): PackingMetrics {
  const totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalArtworkWeight = items.reduce((sum, item) => sum + item.totalWeight, 0);
  const palletCrateWeight = containers.reduce((sum, container) => sum + container.tareWeight, 0);
  const boxTareWeight = boxes.reduce((sum, box) => sum + box.tareWeight, 0);
  const packagingWeight = palletCrateWeight + boxTareWeight;

  return {
    totalPieces,
    totalArtworkWeight: Math.ceil(totalArtworkWeight),
    totalPackagingWeight: Math.ceil(packagingWeight),
  };
}
