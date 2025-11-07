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
    const oversizedPieces: OversizedPiece[] = workOrderSummary.oversizedDetails.map(detail => {
      // Parse dimensions string (e.g., "55 × 31") to get side1 and side2
      const dimensions = this.parseDimensions(detail.dimensions);
      return {
        side1: dimensions.side1,
        side2: dimensions.side2,
        quantity: detail.quantity,
      };
    });

    // Count boxes by type from packing summary
    const boxCounts = this.countBoxesByType(packingSummary);

    // Count containers by type from packing summary
    const containerCounts = this.countContainersByType(packingSummary);

    // Round weights to nearest integer as shown in the example
    const totalArtworkWeight = Math.round(weightSummary.totalArtworkWeightLbs);
    const totalPackagingWeight = Math.round(weightSummary.packagingWeightLbs.total);
    const finalShipmentWeight = Math.round(weightSummary.finalShipmentWeightLbs);

    return {
      total_pieces: workOrderSummary.totalPieces,
      standard_size_pieces: workOrderSummary.standardSizePieces,
      oversized_pieces: oversizedPieces,
      standard_box_count: boxCounts.standard,
      large_box_count: boxCounts.large,
      custom_piece_count: this.countCustomPieces(response),
      standard_pallet_count: containerCounts.standardPallet,
      oversized_pallet_count: containerCounts.oversizedPallet,
      crate_count: containerCounts.crate,
      total_artwork_weight: totalArtworkWeight,
      total_packaging_weight: totalPackagingWeight,
      final_shipment_weight: finalShipmentWeight,
    };
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
   * Counts pieces requiring custom packaging from business intelligence flags.
   */
  private static countCustomPieces(response: PackagingResponse): number {
    let customCount = 0;

    for (const item of response.businessIntelligence.oversizedItems) {
      if (item.recommendation.toLowerCase().includes("custom")) {
        customCount += item.quantity;
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
