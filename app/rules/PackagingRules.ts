/**
 * PackagingRules centralizes all packaging-related business rules and dimension validation logic.
 * This separates packaging concerns from domain entities to reduce coupling and eliminate duplication.
 */
import { Art, ArtType } from "../entities/Art";
import { BoxType } from "../entities/Box";

export interface DimensionLimits {
  readonly STANDARD_MAX_SHORT_SIDE: number;
  readonly STANDARD_MAX_LONG_SIDE: number;
  readonly LARGE_MAX_SIDE: number;
  readonly CUSTOM_PACKAGING_THRESHOLD: number;
}

export const DIMENSION_LIMITS: DimensionLimits = {
  STANDARD_MAX_SHORT_SIDE: 36,
  STANDARD_MAX_LONG_SIDE: 84,
  LARGE_MAX_SIDE: 43.5,
  CUSTOM_PACKAGING_THRESHOLD: 43.5,
} as const;

export class PackagingRules {
  /**
   * Determines if an art piece requires an oversized box
   */
  public static requiresOversizedBox(art: Art): boolean {
    const footprint = this.getPlanarFootprint(art);
    return (
      footprint.longSide > DIMENSION_LIMITS.STANDARD_MAX_SHORT_SIDE &&
      footprint.shortSide > DIMENSION_LIMITS.STANDARD_MAX_SHORT_SIDE &&
      footprint.longSide <= DIMENSION_LIMITS.LARGE_MAX_SIDE &&
      footprint.shortSide <= DIMENSION_LIMITS.LARGE_MAX_SIDE
    );
  }

  /**
   * Determines if an art piece needs custom packaging
   */
  public static needsCustomPackaging(art: Art): boolean {
    const footprint = this.getPlanarFootprint(art);
    return footprint.longSide > DIMENSION_LIMITS.CUSTOM_PACKAGING_THRESHOLD && 
           footprint.shortSide > DIMENSION_LIMITS.CUSTOM_PACKAGING_THRESHOLD;
  }

  /**
   * Determines if an art piece is oversized
   */
  public static isOversized(art: Art): boolean {
    return this.requiresOversizedBox(art);
  }

  /**
   * Checks if an art piece fits in a standard box
   */
  public static fitsInStandardBox(art: Art): boolean {
    const footprint = this.getPlanarFootprint(art);
    const depth = art.getDepth();
    
    if (footprint.shortSide > DIMENSION_LIMITS.STANDARD_MAX_SHORT_SIDE) {
      return false;
    }

    if (footprint.longSide > DIMENSION_LIMITS.STANDARD_MAX_LONG_SIDE) {
      return false;
    }

    // Height check would need to be passed from box specification
    return true;
  }

  /**
   * Checks if an art piece fits in a large box
   */
  public static fitsInLargeBox(art: Art): boolean {
    const footprint = this.getPlanarFootprint(art);
    
    if (footprint.longSide > DIMENSION_LIMITS.LARGE_MAX_SIDE || 
        footprint.shortSide > DIMENSION_LIMITS.LARGE_MAX_SIDE) {
      return false;
    }

    return true;
  }

  /**
   * Checks if an art piece fits in UPS boxes
   */
  public static fitsInUpsBox(art: Art, boxLength: number, boxWidth: number, boxHeight: number): boolean {
    const footprint = this.getPlanarFootprint(art);
    const depth = art.getDepth();
    
    const boxPlanar = [boxLength, boxWidth].sort((a, b) => b - a);
    const artPlanar = [footprint.longSide, footprint.shortSide].sort((a, b) => b - a);

    if (artPlanar[0] > boxPlanar[0]) {
      return false;
    }

    if (artPlanar[1] > boxPlanar[1]) {
      return false;
    }

    if (depth > boxHeight) {
      return false;
    }

    return true;
  }

  /**
   * Gets the planar footprint of an art piece (long side, short side)
   */
  public static getPlanarFootprint(art: Art): { longSide: number; shortSide: number } {
    const dims = art.getDimensions();
    const ordered = [dims.length, dims.width].sort((a, b) => b - a);
    return {
      longSide: ordered[0],
      shortSide: ordered[1],
    };
  }

  /**
   * Determines the appropriate box type for an art piece
   */
  public static getPreferredBoxType(art: Art): BoxType {
    if (this.needsCustomPackaging(art)) {
      throw new Error("Art piece requires custom packaging");
    }
    
    if (this.requiresOversizedBox(art)) {
      return BoxType.Large;
    }
    
    return BoxType.Standard;
  }

  /**
   * Checks if an art piece requires special handling
   */
  public static requiresSpecialHandling(art: Art): boolean {
    if (art.getSpecialHandlingFlags().length > 0) {
      return true;
    }

    return (
      art.getProductType() === ArtType.Mirror ||
      art.getProductType() === ArtType.WallDecor ||
      art.getProductType() === ArtType.AcousticPanelFramed ||
      art.getMaterial() === "GLASS"
    );
  }

  /**
   * Checks if an art piece requires crate-only packaging
   */
  public static requiresCrateOnly(art: Art): boolean {
    return art.getProductType() === ArtType.Mirror;
  }
}
