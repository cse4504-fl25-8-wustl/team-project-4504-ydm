import type { PackagingResponse, PackingSummary } from "../responses/PackagingResponse";
import type { JsonOutputSchema, OversizedPiece } from "./JsonOutputSchema";
import { BoxType } from "../entities/Box";
import { CrateType } from "../entities/Crate";

/**
 * JsonFormatter converts PackagingResponse objects into the standardized
 * JSON output format required by Feature 2.
 */
export class JsonFormatter {
  /**
   * Converts a PackagingResponse to the JSON output schema.
   * 
   * @param response - The packaging response from the interactor
   * @returns JSON-serializable object matching the required schema
   */
  static toJsonOutput(response: PackagingResponse): JsonOutputSchema {
    const { workOrderSummary, weightSummary, packingSummary } = response;

    // Extract oversized pieces from work order summary
    // Only include pieces that are oversized (longSide > 43.5") AND require large boxes (shortSide > 36.5")
    // Exclude: custom pieces (both > 43.5") and pieces that fit in standard boxes (shortSide ≤ 36.5")
    const customPieceCount = this.countCustomPieces(response);
    
    const oversizedPieces: OversizedPiece[] = [];
    for (const detail of workOrderSummary.oversizedDetails) {
      const dimensions = this.parseDimensions(detail.dimensions);
      // Only include if it's oversized (longSide > 43.5") AND requires large box (shortSide > 36.5")
      // Exclude if custom (both > 43.5") or fits in standard box (shortSide ≤ 36.5")
      const isCustom = dimensions.side1 > 43.5 && dimensions.side2 > 43.5;
      const fitsStandardBox = Math.min(dimensions.side1, dimensions.side2) <= 36.5;
      
      if (!isCustom && !fitsStandardBox) {
        // This piece is oversized and requires a large box
        oversizedPieces.push({
          side1: dimensions.side1,
          side2: dimensions.side2,
          quantity: detail.quantity,
        });
      }
    }

    // Count boxes by type from packing summary
    const boxCounts = this.countBoxesByType(packingSummary);

    // Count containers by type from packing summary
    const containerCounts = this.countContainersByType(packingSummary);

    // Round weights to nearest integer (will be formatted as floats in stringify)
    const totalArtworkWeight = Math.round(weightSummary.totalArtworkWeightLbs);
    const totalPackagingWeight = Math.round(weightSummary.packagingWeightLbs.total);
    const finalShipmentWeight = Math.round(weightSummary.finalShipmentWeightLbs);

    // Build output object with conditional oversized_pieces field
    const output: JsonOutputSchema = {
      total_pieces: workOrderSummary.totalPieces,
      standard_size_pieces: workOrderSummary.standardSizePieces,
      standard_box_count: boxCounts.standard,
      large_box_count: boxCounts.large,
      custom_piece_count: response.workOrderSummary.customPieces,
      standard_pallet_count: containerCounts.standardPallet,
      oversized_pallet_count: containerCounts.oversizedPallet,
      crate_count: containerCounts.crate,
      total_artwork_weight: totalArtworkWeight,
      total_packaging_weight: totalPackagingWeight,
      final_shipment_weight: finalShipmentWeight,
    };

    // Only include oversized_pieces if there are pieces that need special handling
    // Don't include if all oversized pieces fit in large boxes
    // Include only if there are oversized pieces AND they require telescoping or special handling
    const hasOversizedBoxes = boxCounts.large > 0;
    if (oversizedPieces.length > 0 && !hasOversizedBoxes) {
      // Only include if oversized pieces don't fit in large boxes
      output.oversized_pieces = oversizedPieces;
    }

    return output;
  }

  /**
   * Parses dimension string to extract side1 (longer) and side2 (shorter).
   * Expected format: "55 × 31" or "55x31"
   */
  private static parseDimensions(dimensionStr: string): { side1: number; side2: number } {
    // Handle both × and x as separators
    const parts = dimensionStr.split(/[×x]/).map(s => parseFloat(s.trim()));
    
    if (parts.length !== 2 || parts.some(isNaN)) {
      throw new Error(`Invalid dimension format: ${dimensionStr}`);
    }

    // side1 should be the longer side
    const [dim1, dim2] = parts;
    const side1 = Math.max(dim1, dim2);
    const side2 = Math.min(dim1, dim2);

    return { side1, side2 };
  }

  /**
   * Counts boxes by type from the packing summary.
   */
  private static countBoxesByType(packingSummary: PackingSummary): {
    standard: number;
    large: number;
  } {
    let standardCount = 0;
    let largeCount = 0;

    for (const boxReq of packingSummary.boxRequirements) {
      // Match box labels to determine type
      if (boxReq.label.toLowerCase().includes("standard")) {
        standardCount += boxReq.count;
      } else if (boxReq.label.toLowerCase().includes("large")) {
        largeCount += boxReq.count;
      }
    }

    return { standard: standardCount, large: largeCount };
  }

  /**
   * Counts containers by type from the packing summary.
   */
  private static countContainersByType(packingSummary: PackingSummary): {
    standardPallet: number;
    oversizedPallet: number;
    crate: number;
  } {
    let standardPalletCount = 0;
    let oversizedPalletCount = 0;
    let crateCount = 0;

    for (const containerReq of packingSummary.containerRequirements) {
      const label = containerReq.label.toLowerCase();
      
      if (label.includes("crate")) {
        crateCount += containerReq.count;
      } else if (label.includes("pallet")) {
        if (label.includes("oversized") || label.includes("oversize")) {
          oversizedPalletCount += containerReq.count;
        } else {
          standardPalletCount += containerReq.count;
        }
      }
    }

    return { standardPallet: standardPalletCount, oversizedPallet: oversizedPalletCount, crate: crateCount };
  }

  /**
   * Counts pieces requiring custom packaging.
   * Custom pieces are those with BOTH dimensions > 43.5"
   * These pieces don't fit in any standard or large box.
   */
  private static countCustomPieces(response: PackagingResponse): number {
    // Count pieces where both dimensions > 43.5" from oversized details
    let customCount = 0;
    for (const detail of response.workOrderSummary.oversizedDetails) {
      const dimensions = this.parseDimensions(detail.dimensions);
      // Custom if BOTH dimensions > 43.5"
      if (dimensions.side1 > 43.5 && dimensions.side2 > 43.5) {
        customCount += detail.quantity;
      }
    }
    return customCount;
  }

  /**
   * Converts the JSON output schema to a formatted JSON string.
   * 
   * @param output - The JSON output schema object
   * @param pretty - Whether to format with indentation (default: true)
   * @returns JSON string
   */
  static stringify(output: JsonOutputSchema, pretty: boolean = true): string {
    if (pretty) {
      return JSON.stringify(output, null, 2);
    }
    return JSON.stringify(output);
  }
}

// Re-export types for convenience
export type { JsonOutputSchema, OversizedPiece };
