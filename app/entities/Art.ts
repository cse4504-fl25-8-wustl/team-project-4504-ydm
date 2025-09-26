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
