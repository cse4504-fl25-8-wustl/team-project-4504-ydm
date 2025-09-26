import { PackedItem as DtoPackedItem, PackedBox as DtoPackedBox, PackedContainer as DtoPackedContainer } from "./dto/PackOutputDTO";
import { PackingPlan } from "./entities/Output";

export interface PlanAdapterResult {
  items: DtoPackedItem[];
  boxes: DtoPackedBox[];
  containers: DtoPackedContainer[];
  manualHandlingItems: {
    lineNumber: number;
    tagNumber: number;
    reason: string;
    recommendedAction: string;
  }[];
}

/**
 * Converts the internal packing plan into DTO-friendly structures.
 * This helper allows Student 2 to keep ownership of the final PackOutputDTO
 * assembly while reusing Student 1 calculations.
 */
export function mapPlanToDtoStructures(plan: PackingPlan): PlanAdapterResult {
  const items: DtoPackedItem[] = plan.items.map((item) => ({
    lineNumber: item.lineNumber,
    tagNumber: item.tagNumber,
    quantity: item.quantity,
    finalMedium: item.finalMedium,
    dimensions: {
      width: item.dimensions.width,
      height: item.dimensions.height,
    },
    weight: item.totalWeight,
    materialType: item.materialType,
    isOversized: item.flags.isOversized,
    requiresLargeBox: item.flags.requiresLargeBox,
    glazing: item.glazing,
    hardware: item.hardware,
  }));

  const boxes: DtoPackedBox[] = plan.boxes.map((box) => ({
    id: box.id,
    type: box.allocationType,
    dimensions: {
      length: box.lengthInches,
      width: box.widthInches,
      height: box.heightInches,
    },
    items: box.items.map((entry) => ({
      lineNumber: entry.groupedItem.item.lineNumber,
      tagNumber: entry.groupedItem.item.tagNumber,
      quantity: entry.allocatedQuantity,
      finalMedium: entry.groupedItem.item.finalMedium,
      weight: entry.allocatedWeight,
      materialType: entry.groupedItem.item.materialType,
      isOversized: entry.groupedItem.item.flags.isOversized,
      requiresLargeBox: entry.groupedItem.item.flags.requiresLargeBox,
      glazing: entry.groupedItem.item.glazing,
      hardware: entry.groupedItem.item.hardware,
    })),
    totalWeight: box.totalWeight,
    piecesCount: box.totalPieces,
  }));

  const containers: DtoPackedContainer[] = plan.containers.map((container) => ({
    id: container.id,
    type: container.kind === "pallet" ? `${container.category}-pallet` : "crate",
    dimensions: {
      length: container.dimensions.length,
      width: container.dimensions.width,
      height: container.dimensions.height,
    },
    weight: container.tareWeight,
    boxes: container.boxes.map((box) => ({
      id: box.id,
      type: box.allocationType,
      dimensions: {
        length: box.lengthInches,
        width: box.widthInches,
        height: box.heightInches,
      },
      items: box.items.map((entry) => ({
        lineNumber: entry.groupedItem.item.lineNumber,
        tagNumber: entry.groupedItem.item.tagNumber,
        quantity: entry.allocatedQuantity,
        finalMedium: entry.groupedItem.item.finalMedium,
        weight: entry.allocatedWeight,
        materialType: entry.groupedItem.item.materialType,
        isOversized: entry.groupedItem.item.flags.isOversized,
        requiresLargeBox: entry.groupedItem.item.flags.requiresLargeBox,
        glazing: entry.groupedItem.item.glazing,
        hardware: entry.groupedItem.item.hardware,
      })),
      totalWeight: box.totalWeight,
      piecesCount: box.totalPieces,
    })),
    totalWeight: container.totalWeight,
  }));

  const manualHandlingItems = plan.manualHandlingItems.map((entry) => ({
    lineNumber: entry.item.lineNumber,
    tagNumber: entry.item.tagNumber,
    reason: entry.reason,
    recommendedAction: entry.recommendedAction,
  }));

  return {
    items,
    boxes,
    containers,
    manualHandlingItems,
  };
}
