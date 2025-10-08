/**
 * DimensionUtils provides centralized dimension calculation utilities.
 * This eliminates DRY violations and provides consistent dimension handling.
 */
export class DimensionUtils {
  /**
   * Rounds dimensions up to the next whole number (conservative approach)
   */
  public static roundUpDimension(value: number): number {
    return Math.ceil(value);
  }

  /**
   * Gets the planar footprint (length x width) sorted by size
   * Centralizes the sorting logic to avoid duplication
   */
  public static getPlanarFootprint(length: number, width: number): { longSide: number; shortSide: number } {
    const ordered = [length, width].sort((a, b) => b - a);
    return {
      longSide: this.roundUpDimension(ordered[0]),
      shortSide: this.roundUpDimension(ordered[1]),
    };
  }

  /**
   * Gets the largest dimension from length, width, height
   */
  public static getLargestDimension(length: number, width: number, height: number): number {
    return Math.max(
      this.roundUpDimension(length),
      this.roundUpDimension(width),
      this.roundUpDimension(height)
    );
  }

  /**
   * Validates that dimensions are positive finite numbers
   */
  public static validateDimensions(length: number, width: number, height?: number): void {
    if (!Number.isFinite(length) || length <= 0) {
      throw new Error(`Invalid length: ${length}`);
    }
    if (!Number.isFinite(width) || width <= 0) {
      throw new Error(`Invalid width: ${width}`);
    }
    if (height !== undefined && (!Number.isFinite(height) || height <= 0)) {
      throw new Error(`Invalid height: ${height}`);
    }
  }

  /**
   * Checks if dimensions fit within a container
   */
  public static fitsWithin(
    itemLength: number,
    itemWidth: number,
    itemHeight: number,
    containerLength: number,
    containerWidth: number,
    containerHeight: number
  ): boolean {
    const itemFootprint = this.getPlanarFootprint(itemLength, itemWidth);
    const containerFootprint = this.getPlanarFootprint(containerLength, containerWidth);
    
    return (
      itemFootprint.longSide <= containerFootprint.longSide &&
      itemFootprint.shortSide <= containerFootprint.shortSide &&
      this.roundUpDimension(itemHeight) <= this.roundUpDimension(containerHeight)
    );
  }

  /**
   * Calculates surface area
   */
  public static calculateSurfaceArea(length: number, width: number): number {
    this.validateDimensions(length, width);
    return length * width;
  }

  /**
   * Calculates volume
   */
  public static calculateVolume(length: number, width: number, height: number): number {
    this.validateDimensions(length, width, height);
    return length * width * height;
  }
}
