import { Art, ArtType, ArtMaterial } from "../entities/Art";

/**
 * PackagingRules encapsulates business rules for packaging decisions.
 * This separates packaging logic from the Art entity.
 */
export class PackagingRules {
  // Box size constants - centralized to avoid magic numbers
  private static readonly STANDARD_BOX_SIZE = 36;
  private static readonly LARGE_BOX_MAX_SIZE = 43.5;
  private static readonly TELESCOPING_MAX_LENGTH = 84;

  /**
   * Determines if an art piece requires special handling
   */
  public static requiresSpecialHandling(art: Art): boolean {
    const flags = art.getSpecialHandlingFlags();
    if (flags.length > 0) {
      return true;
    }

    const productType = art.getProductType();
    const material = art.getMaterial();

    return (
      productType === ArtType.Mirror ||
      productType === ArtType.WallDecor ||
      productType === ArtType.AcousticPanelFramed ||
      material === ArtMaterial.Glass
    );
  }

  /**
   * Determines if an art piece can only be shipped in crates
   */
  public static requiresCrateOnly(art: Art): boolean {
    return art.getProductType() === ArtType.Mirror;
  }

  /**
   * Determines if an art piece requires an oversized box
   */
  public static requiresOversizeBox(art: Art): boolean {
    const footprint = this.getPlanarFootprint(art);
    return (
      footprint.longSide > this.STANDARD_BOX_SIZE &&
      footprint.shortSide > this.STANDARD_BOX_SIZE &&
      footprint.longSide <= this.LARGE_BOX_MAX_SIZE &&
      footprint.shortSide <= this.LARGE_BOX_MAX_SIZE
    );
  }

  /**
   * Determines if an art piece is oversized (alias for requiresOversizeBox)
   */
  public static isOversized(art: Art): boolean {
    return this.requiresOversizeBox(art);
  }

  /**
   * Determines if an art piece needs custom packaging
   */
  public static needsCustomPackaging(art: Art): boolean {
    const footprint = this.getPlanarFootprint(art);
    return footprint.longSide > this.LARGE_BOX_MAX_SIZE && footprint.shortSide > this.LARGE_BOX_MAX_SIZE;
  }

  /**
   * Gets the planar footprint of an art piece - centralized dimension sorting logic
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
   * Validates if dimensions fit within telescoping box constraints
   */
  public static fitsTelescopingBox(art: Art): boolean {
    const footprint = this.getPlanarFootprint(art);
    return footprint.shortSide <= this.STANDARD_BOX_SIZE && footprint.longSide <= this.TELESCOPING_MAX_LENGTH;
  }

  /**
   * Gets packaging recommendation for an art piece
   */
  public static getPackagingRecommendation(art: Art): {
    containerType: 'box' | 'crate' | 'custom';
    boxType?: 'standard' | 'large' | 'telescoping';
    specialHandling: boolean;
  } {
    if (this.requiresCrateOnly(art)) {
      return {
        containerType: 'crate',
        specialHandling: this.requiresSpecialHandling(art)
      };
    }

    if (this.needsCustomPackaging(art)) {
      return {
        containerType: 'custom',
        specialHandling: true
      };
    }

    if (this.requiresOversizeBox(art)) {
      return {
        containerType: 'box',
        boxType: 'large',
        specialHandling: this.requiresSpecialHandling(art)
      };
    }

    if (this.fitsTelescopingBox(art)) {
      const footprint = this.getPlanarFootprint(art);
      const boxType = footprint.longSide > this.STANDARD_BOX_SIZE ? 'telescoping' : 'standard';
      return {
        containerType: 'box',
        boxType,
        specialHandling: this.requiresSpecialHandling(art)
      };
    }

    return {
      containerType: 'box',
      boxType: 'standard',
      specialHandling: this.requiresSpecialHandling(art)
    };
  }
}
