import { Art, ArtMaterial, ArtType } from "../entities/Art";
import { Box, BoxType } from "../entities/Box";
import { Crate, CrateType, ContainerKind } from "../entities/Crate";
import { DeliveryCapabilities, PackagingRequest } from "../requests/PackagingRequest";
import { PackagingRules } from "../rules/PackagingRules";
import { WeightCalculator } from "../calculations/WeightCalculator";
import {
  PackagingResponse,
  WeightSummary,
  PackingSummary,
  BusinessIntelligenceSummary,
  FreightExportSummary,
  PackagingResponseMetadata,
  BoxRequirementSummary,
  ContainerRequirementSummary,
  PackedContainerDimension,
  OversizedItemFlag,
  WorkOrderSummary,
  OversizedPieceDetail,
} from "../responses/PackagingResponse";

export interface BoxPackingResult {
  boxes: Box[];
  unassignedArt: Art[];
  assignments: Map<string, { art: Art; box: Box }>;
  unassignedReasons: Record<string, string>;
}

export interface ContainerPackingResult {
  containers: Crate[];
  unassignedBoxes: Box[];
}

const MAX_PALLET_HEIGHT_IN = 84;

export class PackagingInteractor {
  /**
   * Splits an Art object with large quantity into smaller Art objects
   * that can fit within box capacity limits
   */
  private splitArtByQuantity(art: Art, maxQuantity: number): Art[] {
    const totalQuantity = art.getQuantity();
    if (totalQuantity <= maxQuantity) {
      return [art];
    }

    const splits: Art[] = [];
    let remaining = totalQuantity;
    let splitIndex = 0;

    while (remaining > 0) {
      const quantityForThisSplit = Math.min(remaining, maxQuantity);
      
      // Create a new Art object with the split quantity
      const splitArt = new Art({
        id: `${art.getId()}-split-${splitIndex}`,
        productType: art.getProductType(),
        material: art.getMaterial(),
        dimensions: art.getRawDimensions(),
        quantity: quantityForThisSplit,
        specialHandlingFlags: art.getSpecialHandlingFlags(),
        description: art.getDescription(),
        finalMediumLabel: art.getFinalMediumLabel(),
        glazingLabel: art.getGlazingLabel(),
        hardwareLabel: art.getHardwareLabel(),
        hardwarePiecesPerItem: art.getHardwarePiecesPerItem(),
      });

      splits.push(splitArt);
      remaining -= quantityForThisSplit;
      splitIndex++;
    }

    return splits;
  }

  public packBoxes(artCollection: Art[]): BoxPackingResult {
    const boxes: Box[] = [];
    const unassignedArt: Art[] = [];
    const assignments = new Map<string, { art: Art; box: Box }>();
    const unassignedReasons: Record<string, string> = {};

    for (const art of artCollection) {
      if (PackagingRules.needsCustomPackaging(art)) {
        unassignedArt.push(art);
        unassignedReasons[art.getId()] = "Requires custom packaging (both sides exceed 43.5\")";
        continue;
      }

      if (PackagingRules.requiresCrateOnly(art)) {
        unassignedArt.push(art);
        unassignedReasons[art.getId()] = "Crate-only item; palletization handled later";
        continue;
      }

      const preferredType = PackagingRules.requiresOversizeBox(art) ? BoxType.Large : BoxType.Standard;
      
      // Check if this art needs to be split due to quantity limits
      // Try to add to existing box first
      let targetBox = this.findBoxForArt(boxes, art, preferredType);
      
      if (targetBox && targetBox.canAccommodate(art)) {
        // Can fit in existing box
        targetBox.addArt(art);
        assignments.set(art.getId(), { art, box: targetBox });
      } else {
        // Need to create new box(es) - potentially split if quantity is too large
        const tempBox = new Box({ type: preferredType });
        
        if (tempBox.canAccommodate(art)) {
          // Fits in a single new box
          tempBox.addArt(art);
          boxes.push(tempBox);
          assignments.set(art.getId(), { art, box: tempBox });
        } else {
          // Doesn't fit - need to split the art across multiple boxes
          // This happens when quantity exceeds box capacity
          
          // Determine split size based on whether item requires oversize box
          // Items that fit in standard boxes (one dimension ≤36") can have 6 per box
          // Items that require oversize boxes (both dimensions >36") can have 3 per box
          const requiresOversizeBox = PackagingRules.requiresOversizeBox(art);
          const maxQuantity = requiresOversizeBox ? 3 : 6;
          
          const splits = this.splitArtByQuantity(art, maxQuantity);
          
          for (const splitArt of splits) {
            let splitBox = this.findBoxForArt(boxes, splitArt, preferredType);
            
            if (!splitBox) {
              splitBox = new Box({ type: preferredType });
              if (!splitBox.canAccommodate(splitArt) || !splitBox.addArt(splitArt)) {
                unassignedArt.push(splitArt);
                unassignedReasons[splitArt.getId()] = "Cannot accommodate even after splitting";
                continue;
              }
              boxes.push(splitBox);
            } else {
              if (!splitBox.addArt(splitArt)) {
                // Existing box full, create new one
                splitBox = new Box({ type: preferredType });
                if (!splitBox.canAccommodate(splitArt) || !splitBox.addArt(splitArt)) {
                  unassignedArt.push(splitArt);
                  unassignedReasons[splitArt.getId()] = "Cannot accommodate even after splitting";
                  continue;
                }
                boxes.push(splitBox);
              }
            }
            
            assignments.set(splitArt.getId(), { art: splitArt, box: splitBox });
          }
        }
      }
    }

    return {
      boxes,
      unassignedArt,
      assignments,
      unassignedReasons,
    };
  }

  public packContainers(boxes: Box[], capabilities: DeliveryCapabilities): ContainerPackingResult {
    const containers: Crate[] = [];
    const unassignedBoxes: Box[] = [];

    // Optimize pallet selection for standard boxes when pallets are accepted
    if (capabilities.acceptsPallets && boxes.length > 0) {
      // Count standard vs large boxes
      const standardBoxes = boxes.filter(b => b.getType() === BoxType.Standard);
      const largeBoxes = boxes.filter(b => b.getType() === BoxType.Large);
      
      // For standard boxes, choose optimal pallet configuration
      if (standardBoxes.length > 0) {
        const optimalPalletType = this.selectOptimalPalletType(standardBoxes.length);
        
        // Pack standard boxes into optimal pallets
        for (const box of standardBoxes) {
          let container = containers.find((crate) => 
            crate.getType() === optimalPalletType && crate.canAccommodate(box)
          );

          if (!container) {
            container = new Crate({ type: optimalPalletType });
            if (!container.canAccommodate(box) || !container.addBox(box)) {
              unassignedBoxes.push(box);
              continue;
            }
            containers.push(container);
          } else if (!container.addBox(box)) {
            unassignedBoxes.push(box);
          }
        }
      }
      
      // Pack large boxes into oversize pallets
      for (const box of largeBoxes) {
        let container = containers.find((crate) => 
          crate.getType() === CrateType.OversizePallet && crate.canAccommodate(box)
        );

        if (!container) {
          container = new Crate({ type: CrateType.OversizePallet });
          if (!container.canAccommodate(box) || !container.addBox(box)) {
            unassignedBoxes.push(box);
            continue;
          }
          containers.push(container);
        } else if (!container.addBox(box)) {
          unassignedBoxes.push(box);
        }
      }
    } else {
      // Original logic for crates or when pallets not accepted
      for (const box of boxes) {
        const targetContainerType = this.selectContainerType(box, capabilities);

        if (!targetContainerType) {
          unassignedBoxes.push(box);
          continue;
        }

        let container = containers.find((crate) => crate.getType() === targetContainerType && crate.canAccommodate(box));

        if (!container) {
          container = new Crate({ type: targetContainerType });
          if (!container.canAccommodate(box) || !container.addBox(box)) {
            unassignedBoxes.push(box);
            continue;
          }
          containers.push(container);
        } else if (!container.addBox(box)) {
          unassignedBoxes.push(box);
        }
      }
    }

    return {
      containers,
      unassignedBoxes,
    };
  }

  public packageEverything(request: PackagingRequest): PackagingResponse {
    const processingStart = Date.now();

    const boxResult = this.packBoxes(request.artItems);
    const containerResult = this.packContainers(boxResult.boxes, request.deliveryCapabilities);

    const workOrderSummary = this.buildWorkOrderSummary(request.artItems);
    const weightSummary = this.buildWeightSummary(request.artItems, containerResult);
    const packingSummary = this.buildPackingSummary(boxResult, containerResult);
    const businessIntelligence = this.buildBusinessIntelligence(request, boxResult);
    const freightExport = this.buildFreightExport(request, containerResult, weightSummary.finalShipmentWeightLbs);

    const metadata: PackagingResponseMetadata = {
      warnings: this.buildWarnings(boxResult.boxes),
      errors: this.buildErrorMessages(boxResult, containerResult),
      algorithmUsed: "box-first-fit/pallet-first-fit",
      processingTimeMs: Date.now() - processingStart,
      timestamp: new Date().toISOString(),
    };

    return {
      workOrderSummary,
      weightSummary,
      packingSummary,
      businessIntelligence,
      freightExport,
      metadata,
    };
  }

  private findBoxForArt(boxes: Box[], art: Art, preferredType: BoxType): Box | undefined {
    for (const box of boxes) {
      if (box.getType() === preferredType && box.canAccommodate(art)) {
        return box;
      }
    }

    for (const box of boxes) {
      if (box.canAccommodate(art)) {
        return box;
      }
    }

    return undefined;
  }

  /**
   * Selects the optimal pallet type for a given number of standard boxes
   * Compares standard pallets (4 boxes, 60 lbs) vs oversize pallets (5 boxes, 75 lbs)
   * and chooses the option with lower total weight
   */
  private selectOptimalPalletType(boxCount: number): CrateType {
    // Calculate pallets needed for each option
    const standardPalletsNeeded = Math.ceil(boxCount / 4);
    const oversizePalletsNeeded = Math.ceil(boxCount / 5);
    
    // Calculate total weight for each option
    const standardPalletWeight = standardPalletsNeeded * 60;
    const oversizePalletWeight = oversizePalletsNeeded * 75;
    
    // Choose the option with lower total weight
    // If equal, prefer standard (more common)
    if (oversizePalletWeight < standardPalletWeight) {
      return CrateType.OversizePallet;
    }
    return CrateType.StandardPallet;
  }

  private selectContainerType(box: Box, capabilities: DeliveryCapabilities): CrateType | null {
    const prefersPallets = capabilities.acceptsPallets;
    const prefersCrates = capabilities.acceptsCrates;

    const boxType = box.getType();
    if (prefersPallets) {
      if (boxType === BoxType.Large) {
        return CrateType.OversizePallet;
      }
      return CrateType.StandardPallet;
    }

    if (prefersCrates) {
      return CrateType.StandardCrate;
    }

    return null;
  }

  private buildWorkOrderSummary(artItems: Art[]): WorkOrderSummary {
    // Calculate total pieces
    const totalPieces = artItems.reduce((sum, art) => sum + art.getQuantity(), 0);
    
    // Separate standard and oversized pieces
    let standardSizePieces = 0;
    let oversizedPieces = 0;
    const oversizedMap = new Map<string, { quantity: number; weightLbs: number }>();
    
    for (const art of artItems) {
      const quantity = art.getQuantity();
      const isOversized = PackagingRules.isOversized(art);
      
      if (isOversized) {
        oversizedPieces += quantity;
        
        // Group by dimensions
        const dims = art.getDimensions();
        const longSide = Math.max(dims.length, dims.width);
        const shortSide = Math.min(dims.length, dims.width);
        const dimKey = `${longSide}" x ${shortSide}"`;
        
        const existing = oversizedMap.get(dimKey);
        const weight = WeightCalculator.calculateWeight(art);
        
        if (existing) {
          oversizedMap.set(dimKey, {
            quantity: existing.quantity + quantity,
            weightLbs: existing.weightLbs + weight
          });
        } else {
          oversizedMap.set(dimKey, { quantity, weightLbs: weight });
        }
      } else {
        standardSizePieces += quantity;
      }
    }
    
    // Build oversized details array
    const oversizedDetails: OversizedPieceDetail[] = Array.from(oversizedMap.entries()).map(
      ([dimensions, data]) => ({
        dimensions,
        quantity: data.quantity,
        weightLbs: data.weightLbs
      })
    );
    
    return {
      totalPieces,
      standardSizePieces,
      oversizedPieces,
      oversizedDetails
    };
  }

  private buildWeightSummary(artItems: Art[], containerResult: ContainerPackingResult): WeightSummary {
    const totalArtworkWeight = artItems.reduce((sum, art) => sum + WeightCalculator.calculateWeight(art), 0);
    const glassWeight = artItems
      .filter((art) => art.getMaterial() === ArtMaterial.Glass)
      .reduce((sum, art) => sum + WeightCalculator.calculateWeight(art), 0);
    const oversizedWeight = artItems
      .filter((art) => PackagingRules.isOversized(art))
      .reduce((sum, art) => sum + WeightCalculator.calculateWeight(art), 0);

    const pallets = containerResult.containers.filter((container) => container.getContainerKind() === ContainerKind.Pallet);
    const crates = containerResult.containers.filter((container) => container.getContainerKind() === ContainerKind.Crate);

    const palletWeight = pallets.reduce((sum, pallet) => sum + pallet.getTareWeight(), 0);
    const crateWeight = crates.reduce((sum, crate) => sum + crate.getTareWeight(), 0);

    const packagingWeight = palletWeight + crateWeight;

    return {
      totalArtworkWeightLbs: totalArtworkWeight,
      glassFramedWeightLbs: glassWeight,
      oversizedWeightLbs: oversizedWeight,
      packagingWeightLbs: {
        total: packagingWeight,
        pallets: {
          count: pallets.length,
          totalWeight: palletWeight,
        },
        crates: {
          count: crates.length,
          totalWeight: crateWeight,
        },
      },
      finalShipmentWeightLbs: totalArtworkWeight + packagingWeight,
    };
  }

  private buildPackingSummary(
    boxResult: BoxPackingResult,
    containerResult: ContainerPackingResult,
  ): PackingSummary {
    const boxRequirements: BoxRequirementSummary[] = this.summarizeBoxes(boxResult.boxes);
    const containerRequirements: ContainerRequirementSummary[] = this.summarizeContainers(containerResult.containers);
    const packedContainerDimensions: PackedContainerDimension[] = this.buildContainerDimensions(containerResult.containers);
    const hardware = this.summarizeHardware(boxResult);

    return {
      boxRequirements,
      containerRequirements,
      packedContainerDimensions,
      hardware,
    };
  }

  private summarizeBoxes(boxes: Box[]): BoxRequirementSummary[] {
    const groups = new Map<BoxType, BoxRequirementSummary>();

    for (const box of boxes) {
      const type = box.getType();
      if (!groups.has(type)) {
        const spec = box.getSpecification();
        groups.set(type, {
          label: this.describeBoxType(type),
          dimensions: `${spec.innerLength}\"x${spec.innerWidth}\"x${spec.innerHeight}\"`,
          count: 0,
        });
      }
      const entry = groups.get(type)!;
      entry.count += 1;
    }

    return Array.from(groups.values());
  }

  private summarizeContainers(containers: Crate[]): ContainerRequirementSummary[] {
    const groups = new Map<CrateType, ContainerRequirementSummary>();

    for (const container of containers) {
      const type = container.getType();
      if (!groups.has(type)) {
        const spec = container.getSpecification();
        const dimensions = this.describeContainerDimensions(spec.type);
        groups.set(type, {
          label: this.describeContainerType(spec.type),
          dimensions,
          count: 0,
        });
      }

      const entry = groups.get(type)!;
      entry.count += 1;
    }

    return Array.from(groups.values());
  }

  private buildContainerDimensions(containers: Crate[]): PackedContainerDimension[] {
    return containers.map((container, index) => {
      const boxes = container.getContents();
      const footprint = this.calculateCrateFootprint(boxes);
      return {
        containerId: `${this.describeContainerType(container.getType())} ${index + 1}`,
        dimensions: `${footprint.length}\"x${footprint.width}\"x${Math.min(footprint.height, MAX_PALLET_HEIGHT_IN)}\"`,
        weightLbs: container.getTotalWeight(),
      };
    });
  }

  private summarizeHardware(boxResult: BoxPackingResult) {
    const hardwareLineItems = new Map<string, { totalPieces: number; artQuantity: number }>();

    const aggregate = (art: Art) => {
      const label = art.getHardwareLabel();
      if (!label) {
        return;
      }

      const pieces = art.getHardwarePiecesTotal();
      if (!hardwareLineItems.has(label)) {
        hardwareLineItems.set(label, { totalPieces: 0, artQuantity: 0 });
      }

      const entry = hardwareLineItems.get(label)!;
      entry.totalPieces += pieces;
      entry.artQuantity += 1;
    };

    boxResult.assignments.forEach(({ art }) => {
      aggregate(art);
    });

    for (const art of boxResult.unassignedArt) {
      aggregate(art);
    }

    const lineItemSummary = Array.from(hardwareLineItems.entries()).map(([hardwareLabel, details]) => ({
      hardwareLabel,
      totalPieces: details.totalPieces,
      artQuantity: details.artQuantity,
    }));

    const totalsByHardwareType: Record<string, number> = {};
    let totalPieces = 0;

    for (const entry of lineItemSummary) {
      totalsByHardwareType[entry.hardwareLabel] = entry.totalPieces;
      totalPieces += entry.totalPieces;
    }

    return {
      lineItemSummary,
      totalsByHardwareType,
      totalPieces,
    };
  }

  private buildBusinessIntelligence(
    request: PackagingRequest,
    boxResult: BoxPackingResult,
  ): BusinessIntelligenceSummary {
    const oversizeFlags = this.buildOversizeFlags(boxResult.boxes);
    const mediumsToFlag = this.identifyMediumsToFlag(boxResult);

    return {
      clientRulesApplied: ["Standard packing (no client restrictions)"],
      oversizedItems: oversizeFlags,
      mediumsToFlag,
      alternativeRecommendations: [
        "Current method: pallets only",
        "Alternative: mix pallets + crates if destination accepts crates",
      ],
      riskFlags: this.buildRiskFlags(boxResult),
    };
  }

  private buildOversizeFlags(boxes: Box[]): OversizedItemFlag[] {
    const oversizeMap = new Map<string, { quantity: number }>();

    for (const box of boxes) {
      if (box.getType() !== BoxType.Large) {
        continue;
      }

      const dims = box.getRequiredDimensions();
      const key = `${dims.length}\"x${dims.width}\"`;
      if (!oversizeMap.has(key)) {
        oversizeMap.set(key, { quantity: 0 });
      }
      oversizeMap.get(key)!.quantity += box.getContents().length;
    }

    return Array.from(oversizeMap.entries()).map(([dimensions, data]) => ({
      dimensions,
      quantity: data.quantity,
      recommendation: "Requires large box",
    }));
  }

  private identifyMediumsToFlag(boxResult: BoxPackingResult): string[] {
    const flagged = new Set<string>();

    for (const box of boxResult.boxes) {
      for (const art of box.getContents()) {
        if (art.getProductType() === ArtType.WallDecor) {
          flagged.add("Wall Decor – include item URL for documentation");
        }

        if (art.getProductType() === ArtType.MetalPrint) {
          flagged.add("Metal Prints – verify protective wrapping");
        }
      }
    }

    return Array.from(flagged);
  }

  private buildRiskFlags(boxResult: BoxPackingResult): string[] {
    const hasGlass = boxResult.boxes.some((box) =>
      box.getContents().some((art) => art.getMaterial() === ArtMaterial.Glass),
    );
    const hasMirrors = boxResult.boxes.some((box) =>
      box.getContents().some((art) => art.getProductType() === ArtType.Mirror),
    );

    const flags: string[] = [];
    if (!hasGlass && !hasMirrors) {
      flags.push("No high-risk items detected");
    } else {
      if (hasGlass) {
        flags.push("Handle glass-framed pieces with caution");
      }
      if (hasMirrors) {
        flags.push("Mirror items require crate review");
      }
    }

    return flags;
  }

  private buildFreightExport(
    request: PackagingRequest,
    containerResult: ContainerPackingResult,
    finalShipmentWeight: number,
  ): FreightExportSummary {
    const containerLines = containerResult.containers.map((container) => {
      const footprint = this.calculateCrateFootprint(container.getContents());
      return `${footprint.length}\"x${footprint.width}\"x${Math.min(footprint.height, MAX_PALLET_HEIGHT_IN)}\" @ ${container.getTotalWeight()} lbs`;
    });

    return {
      subject: `Quote Request - ${request.clientName} - ${request.jobSiteLocation}`,
      shipmentDetails: [
        `Total Weight: ${finalShipmentWeight} lbs`,
        `Pieces: ${containerResult.containers.length} pallets`,
        `Dimensions: ${containerLines.join(", ")}`,
        `Pickup: ARCH Design, St. Louis, MO`,
        `Delivery: ${request.jobSiteLocation}`,
        `Special Requirements: ${this.describeDeliveryCapabilities(request.deliveryCapabilities)}`,
      ],
    };
  }

  private buildWarnings(boxes: Box[]): string[] {
    const warnings: string[] = [];

    boxes.forEach((box, index) => {
      const telescopingLength = box.getTelescopingLength();
      if (telescopingLength !== null) {
        warnings.push(`Box ${index + 1} telescoped to ${telescopingLength}\" (max ${MAX_PALLET_HEIGHT_IN}\")`);
      }
    });

    return warnings;
  }

  private buildErrorMessages(boxResult: BoxPackingResult, containerResult: ContainerPackingResult): string[] {
    const errors: string[] = [];

    if (boxResult.unassignedArt.length > 0) {
      errors.push(`${boxResult.unassignedArt.length} item(s) require custom handling or crates.`);
    }

    if (containerResult.unassignedBoxes.length > 0) {
      errors.push(`${containerResult.unassignedBoxes.length} box(es) could not be assigned to pallets.`);
    }

    return errors;
  }

  private calculateCrateFootprint(boxes: Box[]): { length: number; width: number; height: number } {
    if (boxes.length === 0) {
      return { length: 0, width: 0, height: 0 };
    }

    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0;

    for (const box of boxes) {
      const dims = box.getRequiredDimensions();
      maxLength = Math.max(maxLength, dims.length);
      maxWidth = Math.max(maxWidth, dims.width);
      totalHeight += dims.height;
    }

    return { length: maxLength, width: maxWidth, height: totalHeight };
  }

  private describeBoxType(type: BoxType): string {
    switch (type) {
      case BoxType.Standard:
        return "Standard box";
      case BoxType.Large:
        return "Large box";
      case BoxType.UpsSmall:
        return "UPS small carton";
      case BoxType.UpsLarge:
        return "UPS large carton";
      default:
        return "Box";
    }
  }

  private describeContainerType(type: CrateType): string {
    switch (type) {
      case CrateType.StandardPallet:
        return "Standard pallet";
      case CrateType.OversizePallet:
        return "Oversize pallet";
      case CrateType.GlassPallet:
        return "Glass pallet";
      case CrateType.StandardCrate:
        return "Standard crate";
      default:
        return "Container";
    }
  }

  private describeContainerDimensions(type: CrateType): string {
    switch (type) {
      case CrateType.StandardPallet:
        return "48\"x40\"";
      case CrateType.OversizePallet:
        return "60\"x40\"";
      case CrateType.GlassPallet:
        return "43\"x35\"";
      case CrateType.StandardCrate:
        return "Custom";
      default:
        return "Unknown";
    }
  }

  private describeDeliveryCapabilities(capabilities: DeliveryCapabilities): string {
    const flags: string[] = [];
    if (capabilities.hasLoadingDock) {
      flags.push("Loading dock");
    }
    if (capabilities.requiresLiftgate) {
      flags.push("Liftgate");
    }
    if (capabilities.needsInsideDelivery) {
      flags.push("Inside delivery");
    }
    if (flags.length === 0) {
      return "None";
    }
    return flags.join(", ");
  }
}
