import { MaterialType } from "../../pack/domain/dto/PackInputDTO";

export interface Dimensions {
  width: number;
  height: number;
  depth: number; // derived depth estimate used for stacking
}

export interface ItemFlags {
  isOversized: boolean;
  requiresLargeBox: boolean;
  requiresCrate: boolean;
  containsGlass: boolean;
  isWallDecor: boolean;
  isTactilePanel: boolean;
  isRaisedFloatMount: boolean;
}

export interface ManualHandlingInfo {
  required: boolean;
  reason?: string;
  recommendedAction?: string;
}

export interface ProcessedItem {
  id: string;
  lineNumber: number;
  tagNumber: number;
  finalMedium: string;
  glazing?: string;
  hardware?: string;
  quantity: number;
  materialType: MaterialType;
  dimensions: Dimensions;
  pieceWeight: number; // single piece weight rounded up to whole number
  totalWeight: number; // quantity * pieceWeight
  flags: ItemFlags;
  manualHandling: ManualHandlingInfo;
  wallDecorPieces?: number; // expanded pieces for installation calculations
  notes: string[];
}

export interface GroupedItem {
  item: ProcessedItem;
  quantity: number;
  totalWeight: number;
}

export type ItemGroupingKey = string;

export interface ItemGrouping {
  key: ItemGroupingKey;
  items: GroupedItem[];
  materialType: MaterialType;
  flags: ItemFlags;
}
