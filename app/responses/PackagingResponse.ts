/**
 * DTOs representing the output from the packageEverything use case.
 * These mirror the entity layer but remain immutable data carriers.
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
