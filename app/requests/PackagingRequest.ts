import { Art } from "../entities/Art";

/**
 * DTO describing the inputs required to run the packageEverything use case.
 */
export interface PackagingRequest {
  /** Full set of art objects that must be packed. */
  readonly artItems: Art[];
  /** Indicates whether the client site can receive crates (otherwise pallets only). */
  readonly clientAcceptsCrates: boolean;
}
