import { Art } from "../entities/Art";
import { Box, BoxType } from "../entities/Box";

/**
 * Result of a box packing operation
 */
export interface BoxPackingResult {
  boxes: Box[];
  unassignedArt: Art[];
  assignments: Map<string, { art: Art; box: Box }>;
  unassignedReasons: Record<string, string>;
}

/**
 * Metadata describing a packing strategy
 */
export interface PackingStrategyMetadata {
  /** Unique identifier for the strategy */
  id: string;
  /** Display name for the strategy */
  name: string;
  /** Non-technical description for end users */
  description: string;
  /** When to use this strategy */
  bestFor: string;
  /** Technical algorithm name */
  algorithmName: string;
}

/**
 * Interface for box packing strategies
 * Implements the Strategy Design Pattern
 */
export interface PackingStrategy {
  /**
   * Get metadata about this strategy
   */
  getMetadata(): PackingStrategyMetadata;

  /**
   * Pack art items into boxes using this strategy
   * @param artCollection - Collection of art items to pack
   * @returns Packing result with boxes and unassigned items
   */
  packBoxes(artCollection: Art[]): BoxPackingResult;
}
