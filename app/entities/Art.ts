/**
 * Art represents a single piece to be packed. The eventual implementation must provide:
 * - Constructor or factory receiving identifiers, product type (ArtType), dimensions, weight,
 *   and any special-handling flags parsed from the CSV.
 * - Immutable getters so interactors and boxes can query characteristics without mutating state.
 * - Derived helpers (e.g., getLargestDimension) used by packing rules to quickly determine fit.
 * When these methods are implemented according to the above, the rest of the pipeline
 * (parser -> interactor -> response) will have all the data required to evaluate capacity,
 * weight, and handling rules.
 */
export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export enum ArtType {
  Painting = "PAINTING",
  Canvas = "CANVAS",
  TactilePanel = "TACTILE_PANEL",
}

export class Art {
  public getProductType(): ArtType {
    return ArtType.Painting;
  }

  public getDimensions(): Dimensions {
    return { length: 0, width: 0, height: 0 };
  }

  public getWeight(): number {
    return 0;
  }

  public requiresSpecialHandling(): boolean {
    return false;
  }

  public getLargestDimension(): number {
    return 0;
  }
}
