export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export class Art {
  public getProductType(): string {
    return ""; // enum ArtType { Painting, Canvas, TactilePanel }
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
