/**
 * JSON output schema for Feature 2 requirements.
 * This schema matches the specification provided in the assignment.
 */

export interface OversizedPiece {
  side1: number;
  side2: number;
  quantity: number;
}

export interface JsonOutputSchema {
  total_pieces: number;
  standard_size_pieces: number;
  oversized_pieces?: OversizedPiece[];
  standard_box_count: number;
  large_box_count: number;
  custom_piece_count: number;
  standard_pallet_count: number;
  oversized_pallet_count: number;
  crate_count: number;
  total_artwork_weight: number;
  total_packaging_weight: number;
  final_shipment_weight: number;
}
