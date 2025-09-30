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
}

export interface BoxPackingSummary {
  readonly boxId: string;
  readonly itemIds: string[];
  readonly weight: number;
}

export type ContainerType = "CRATE" | "PALLET";

export interface ContainerSummary {
  readonly containerId: string;
  readonly type: ContainerType;
  readonly boxIds: string[];
  readonly weight: number;
  readonly height: number;
}

export interface PackagingResponse {
  readonly itemSummaries: ItemWeightSummary[];
  readonly boxSummaries: BoxPackingSummary[];
  readonly containerSummaries: ContainerSummary[];
  readonly totalShipmentWeight: number;
}
