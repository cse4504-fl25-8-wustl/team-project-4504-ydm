/**
 * DTOs representing the output from the packageEverything use case.
 * Implementers are expected to populate each structure based on the final packing state produced
 * by PackagingInteractor:
 * - ItemWeightSummary: one entry per Art, including identifiers and computed weight.
 * - BoxPackingSummary: describes which items share a box plus that box's total weight.
 * - ContainerSummary: captures crate or pallet assignments, total container weight, and height.
 * - PackagingResponse: aggregates all summaries and provides a total shipment weight figure.
 * If new reporting requirements arise (e.g., cost estimates), extend these DTOs and update the
 * CLI printer to preserve backward compatibility for downstream consumers.
 */

export interface ItemWeightSummary {
  readonly itemId: string;
  readonly weight: number;
  readonly dimensions: {
    readonly length: number;
    readonly width: number;
    readonly height: number;
  };
  readonly productType: string;
  readonly requiresSpecialHandling: boolean;
  readonly packingStatus: "PACKED" | "UNASSIGNED" | "ERROR";
  readonly errorMessage?: string;
}

export interface BoxPackingSummary {
  readonly boxId: string;
  readonly itemIds: string[];
  readonly weight: number;
  readonly dimensions: {
    readonly length: number;
    readonly width: number;
    readonly height: number;
  };
  readonly utilizationPercentage: number;
  readonly packingEfficiency: number;
  readonly packingStatus: "PACKED" | "UNASSIGNED" | "OVERFLOW";
}

export type ContainerType = "CRATE" | "PALLET";

export interface ContainerSummary {
  readonly containerId: string;
  readonly type: ContainerType;
  readonly boxIds: string[];
  readonly weight: number;
  readonly height: number;
  readonly dimensions: {
    readonly length: number;
    readonly width: number;
    readonly height: number;
  };
  readonly utilizationPercentage: number;
  readonly estimatedCost: number;
  readonly packingReasoning: string[];
}

export interface PackingMetrics {
  readonly totalItems: number;
  readonly packedItems: number;
  readonly unassignedItems: number;
  readonly totalBoxes: number;
  readonly totalContainers: number;
  readonly overallPackingEfficiency: number;
  readonly weightUtilization: number;
  readonly volumeUtilization: number;
}

export interface PackingError {
  readonly errorType: "CAPACITY_EXCEEDED" | "DIMENSION_MISMATCH" | "WEIGHT_LIMIT" | "SPECIAL_HANDLING" | "DELIVERY_CONSTRAINT";
  readonly message: string;
  readonly affectedItemIds: string[];
  readonly suggestedAction: string;
}

export interface FallbackOptions {
  readonly availableAlternatives: string[];
  readonly recommendedAction: string;
  readonly estimatedAdditionalCost: number;
  readonly deliveryImpact: string;
}

export interface PackagingResponse {
  readonly itemSummaries: ItemWeightSummary[];
  readonly boxSummaries: BoxPackingSummary[];
  readonly containerSummaries: ContainerSummary[];
  readonly totalShipmentWeight: number;
  readonly totalShipmentVolume: number;
  readonly estimatedTotalCost: number;
  readonly packingMetrics: PackingMetrics;
  readonly errors: PackingError[];
  readonly warnings: string[];
  readonly fallbackOptions?: FallbackOptions;
  readonly packingAlgorithmUsed: string;
  readonly processingTimeMs: number;
  readonly timestamp: string;
}
