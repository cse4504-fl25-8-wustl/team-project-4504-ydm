import type { PackedBox } from "./Box";
import type { PackedContainer } from "./Container";
import type { ProcessedItem } from "./Item";

export interface ManualHandlingItem {
  item: ProcessedItem;
  reason: string;
  recommendedAction: string;
}

export interface PackingMetrics {
  totalPieces: number;
  totalArtworkWeight: number;
  totalPackagingWeight: number;
}

export interface PackingPlan {
  items: ProcessedItem[];
  boxes: PackedBox[];
  containers: PackedContainer[];
  manualHandlingItems: ManualHandlingItem[];
  warnings: string[];
  advisoryNotes: string[];
  metrics: PackingMetrics;
}
