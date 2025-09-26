import type { MaterialType } from "../domain/dto/PackInputDTO";
import type { BoxAllocationType } from "../domain/entities/Box";
import type { ManualHandlingInfo, ProcessedItem } from "../domain/entities/Item";
import type { PalletCategory } from "../domain/entities/Container";
import type { PackInputDTO } from "../domain/dto/PackInputDTO";

export interface RuleContext {
  clientName: string;
  deliveryCapabilities: PackInputDTO["deliveryCapabilities"];
}

export type OversizeClass = "standard" | "oversize";

export interface CrateCapacityResult {
  piecesPerCrate: number;
  notes?: string;
}

export interface PackingRuleProfile {
  readonly id: string;
  readonly label: string;
  getDefaultDepthInches(item: ProcessedItem): number;
  getPiecesPerBox(materialType: MaterialType, context: RuleContext): number;
  evaluateManualHandling(item: ProcessedItem): ManualHandlingInfo;
  resolveBoxAllocation(item: ProcessedItem): BoxAllocationType;
  resolveCrateCapacity(materialType: MaterialType, oversizeClass: OversizeClass): CrateCapacityResult | null;
  shouldRouteBoxesToCrate(context: RuleContext): boolean;
  determinePalletCategory(box: BoxAllocationType, containsGlass: boolean): PalletCategory;
  getRuleWarnings(): string[];
}
