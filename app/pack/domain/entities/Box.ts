import type { BoxType } from "../../pack/data/getCatalogs";
import type { GroupedItem } from "./Item";
import type { MaterialType } from "../../pack/domain/dto/PackInputDTO";

export type BoxAllocationType = "standard" | "large" | "ups-small" | "ups-large";

export interface PackedItemReference {
  groupedItem: GroupedItem;
  allocatedQuantity: number;
  allocatedWeight: number;
}

export interface PackedBox {
  id: string;
  catalogType: BoxType;
  allocationType: BoxAllocationType;
  primaryMaterial: MaterialType;
  containsGlass: boolean;
  items: PackedItemReference[];
  totalPieces: number;
  contentWeight: number;
  tareWeight: number;
  totalWeight: number; // content + tare weight
  requiresCrate: boolean;
  requiresGlassPallet: boolean;
  heightInches: number;
  widthInches: number;
  lengthInches: number;
  notes: string[];
}

export interface BoxCapacityRule {
  piecesPerBox: number;
  notes?: string;
}
