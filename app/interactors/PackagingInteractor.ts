import { Art } from "../entities/Art";
import { Box } from "../entities/Box";
import { Crate } from "../entities/Crate";
import { PackagingRequest } from "../requests/PackagingRequest";
import { PackagingResponse } from "../responses/PackagingResponse";

/**
 * PackagingInteractor centralizes both box-packing and crate-packing use cases.
 * The interface exposes individual algorithms plus a high-level packageEverything request.
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
    return {
      itemSummaries: [],
      boxSummaries: [],
      containerSummaries: [],
      totalShipmentWeight: 0,
    };
  }
}
