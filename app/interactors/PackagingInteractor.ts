import { Art } from "../entities/Art";
import { Box } from "../entities/Box";
import { Crate } from "../entities/Crate";
import { PackagingRequest } from "../requests/PackagingRequest";
import { PackagingResponse } from "../responses/PackagingResponse";

/**
 * PackagingInteractor orchestrates the packing workflows. When implementing fully, ensure that:
 * - packBoxes iterates over Art items, finds or creates a Box that can accommodate each piece
 *   (using Box.canAccommodate/isAtCapacity), and collects any items that fail into unassignedArt.
 * - packCrates takes the resulting boxes, places them into Crate instances using crate capacity
 *   checks, and records boxes that cannot be assigned.
 * - packageEverything executes both steps, then transforms the final state into a PackagingResponse
 *   (using DTOs from app/responses). The response must contain item-level weights, box contents,
 *   crate/pallet summaries, and total shipment weight.
 * - Error handling (e.g., no available containers) should be captured in unassigned collections or
 *   by extending the response model with diagnostics as needed by the team.
 */
export interface BoxPackingResult {
  boxes: Box[];
  unassignedArt: Art[];
}

/** Result object for the crate-packing algorithm. */
export interface CratePackingResult {
  crates: Crate[];
  unassignedBoxes: Box[];
}

export class PackagingInteractor {
  /** Executes the box-packing algorithm for a collection of art pieces. */
  public packBoxes(artCollection: Art[]): BoxPackingResult {
    const boxes = artCollection.map((art) => {
      const box = new Box();
      box.addArt(art);
      return box;
    });

    return {
      boxes,
      unassignedArt: [],
    };
  }

  /** Executes the crate-packing algorithm for a collection of boxes. */
  public packCrates(boxes: Box[]): CratePackingResult {
    const crates = boxes.map((box) => {
      const crate = new Crate();
      crate.addBox(box);
      return crate;
    });

    return {
      crates,
      unassignedBoxes: [],
    };
  }

  /** High-level use case that will orchestrate both algorithms. */
  public packageEverything(request: PackagingRequest): PackagingResponse {
    void request;
    return {
      itemSummaries: [],
      boxSummaries: [],
      containerSummaries: [],
      totalShipmentWeight: 0,
    };
  }
}
