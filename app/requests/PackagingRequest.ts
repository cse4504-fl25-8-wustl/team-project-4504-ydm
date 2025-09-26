import { Art } from "../entities/Art";

export interface DeliveryCapabilities {
  readonly acceptsPallets: boolean;
  readonly acceptsCrates: boolean;
  readonly hasLoadingDock: boolean;
  readonly requiresLiftgate: boolean;
  readonly needsInsideDelivery: boolean;
}

/**
 * DTO describing the inputs required to run the packageEverything use case.
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
