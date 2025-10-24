import { Art, ArtMaterial } from "../entities/Art";

/**
 * WeightCalculator encapsulates weight calculation logic.
 * This separates calculation concerns from the Art entity.
 */
export class WeightCalculator {
  private static readonly MATERIAL_WEIGHT_LB_PER_SQIN: Record<ArtMaterial, number> = {
    [ArtMaterial.Glass]: 0.0098,
    [ArtMaterial.Acrylic]: 0.0094,
    [ArtMaterial.CanvasFramed]: 0.0085,
    [ArtMaterial.CanvasGallery]: 0.0061,
    [ArtMaterial.Mirror]: 0.0191,
    [ArtMaterial.AcousticPanel]: 0.0038,
    [ArtMaterial.AcousticPanelFramed]: 0.0037,
    [ArtMaterial.PatientBoard]: 0.0347,
    [ArtMaterial.NoGlazing]: 0.0,
    [ArtMaterial.Unknown]: 0.0,
  };

  /**
   * Calculates the weight of an art piece
   * Throws error for unknown materials instead of silently defaulting to 0
   * 
   * IMPORTANT: Weight is rounded up at the INDIVIDUAL PIECE level, then multiplied by quantity.
   * This ensures conservative estimates as per requirements.
   */
  public static calculateWeight(art: Art): number {
    const material = art.getMaterial();
    const weightFactor = this.MATERIAL_WEIGHT_LB_PER_SQIN[material];
    
    if (weightFactor === undefined) {
      throw new Error(`Unknown material weight factor for: ${material}`);
    }

    // Handle unknown material explicitly
    if (material === ArtMaterial.Unknown) {
      console.warn(`Warning: Using default weight (0) for unknown material on art piece ${art.getId()}`);
    }

    const dims = art.getDimensions();
    const surfaceArea = dims.length * dims.width;
    
    // Calculate weight per individual piece
    const weightPerPiece = surfaceArea * weightFactor;
    
    // Round up at the individual piece level (conservative approach)
    const roundedWeightPerPiece = this.roundUpWeight(weightPerPiece);
    
    // Multiply by quantity AFTER rounding
    return roundedWeightPerPiece * art.getQuantity();
  }

  /**
   * Rounds weight up to next whole number (conservative approach)
   */
  private static roundUpWeight(weight: number): number {
    return Math.ceil(weight);
  }

  /**
   * Calculates total weight for multiple art pieces
   */
  public static calculateTotalWeight(artPieces: Art[]): number {
    return artPieces.reduce((total, art) => total + this.calculateWeight(art), 0);
  }

  /**
   * Gets the weight factor for a material (for external calculations)
   */
  public static getWeightFactor(material: ArtMaterial): number {
    const factor = this.MATERIAL_WEIGHT_LB_PER_SQIN[material];
    if (factor === undefined) {
      throw new Error(`Unknown material weight factor for: ${material}`);
    }
    return factor;
  }
}
