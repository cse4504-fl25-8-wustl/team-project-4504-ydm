import { Art } from "../entities/Art";

export interface DeliveryCapabilities {
  readonly acceptsPallets: boolean;
  readonly acceptsCrates: boolean;
  readonly hasLoadingDock: boolean;
  readonly requiresLiftgate: boolean;
  readonly needsInsideDelivery: boolean;
}

/**
 * PackagingRequest captures the normalized input for the packageEverything use case.
 * Implementers updating this interface should keep it in sync with cli/main.ts argument
 * parsing and ensure all fields are populated by the CSV parser or CLI defaults. If additional
 * validation helpers are required (e.g., ensuring mutually exclusive flags), they should live
 * alongside this type definition or inside the CLI layer.
 */
export interface PackagingRequest {
  /** Full set of art objects that must be packed. */
  readonly artItems: Art[];
  /** Client name for downstream business rule lookups. */
  readonly clientName: string;
  /** Job site location descriptor. */
  readonly jobSiteLocation: string;
  /** Selected service type (e.g., Delivery + Installation). */
  readonly serviceType: string;
  /** Delivery capabilities/constraints communicated by the job site. */
  readonly deliveryCapabilities: DeliveryCapabilities;
}
