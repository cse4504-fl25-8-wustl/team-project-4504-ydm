import { PackagingResponse } from "../responses/PackagingResponse";

/**
 * Formats a PackagingResponse into the human-readable text format
 * specified by the client in the Piazza post.
 */
export class TextFormatter {
  static formatResponse(response: PackagingResponse): string {
    const lines: string[] = [];

    // Work Order Summary
    lines.push("Work Order Summary:");
    lines.push(`- Total Pieces: ${response.workOrderSummary.totalPieces}`);
    lines.push(`- Standard Size Pieces: ${response.workOrderSummary.standardSizePieces} (estimated at 43" x 33")`);
    lines.push(`- Oversized Pieces: ${response.workOrderSummary.oversizedPieces}`);
    
    // Oversized details
    for (const detail of response.workOrderSummary.oversizedDetails) {
      lines.push(`   * ${detail.dimensions} (Qty: ${detail.quantity}) = ${detail.weightLbs} lbs`);
    }
    
    lines.push(""); // Blank line
    
    // Weight Summary
    lines.push(`Total Artwork Weight: ${response.weightSummary.totalArtworkWeightLbs} lbs`);
    lines.push(`Total Packaging Weight: ${response.weightSummary.packagingWeightLbs.total} lbs`);
    lines.push(`Final Shipment Weight: ${response.weightSummary.finalShipmentWeightLbs} lbs`);

    return lines.join("\n");
  }
}
