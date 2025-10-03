import { Art, ArtType, GlazingType } from "../entities/Art";
import { Box } from "../entities/Box";
import { Crate } from "../entities/Crate";

/**
 * Packing strategy interface for different box packing algorithms.
 * Allows for pluggable packing strategies (first-fit, best-fit, etc.)
 */
export interface BoxPackingStrategy {
  pack(artItems: Art[], availableBoxes?: Box[]): BoxPackingResult;
}

/**
 * Packing strategy interface for different crate packing algorithms.
 */
export interface CratePackingStrategy {
  pack(boxes: Box[], availableCrates?: Crate[]): CratePackingResult;
}

/**
 * Result object for box packing operations.
 */
export interface BoxPackingResult {
  boxes: Box[];
  unassignedArt: Art[];
  packingEfficiency: number;
  totalWeight: number;
}

/**
 * Result object for crate packing operations.
 */
export interface CratePackingResult {
  crates: Crate[];
  unassignedBoxes: Box[];
  packingEfficiency: number;
  totalWeight: number;
}

/**
 * First-fit decreasing algorithm for box packing.
 * Sorts items by size (largest first) and places each in the first box that can accommodate it.
 */
export class FirstFitDecreasingBoxPacking implements BoxPackingStrategy {
  pack(artItems: Art[], availableBoxes: Box[] = []): BoxPackingResult {
    const boxes = [...availableBoxes];
    const unassignedArt: Art[] = [];
    
    // Sort art items by largest dimension (descending) for better packing efficiency
    // Prioritize fragile items (mirrors, glass) to be packed first for better protection
    const sortedArt = [...artItems].sort((a, b) => {
      const aFragile = this.isFragileItem(a);
      const bFragile = this.isFragileItem(b);
      
      // Fragile items first
      if (aFragile && !bFragile) return -1;
      if (!aFragile && bFragile) return 1;
      
      // Then by largest dimension
      return b.getLargestDimension() - a.getLargestDimension();
    });

    for (const art of sortedArt) {
      let placed = false;

      // Try to place in existing boxes first
      for (const box of boxes) {
        if (box.canAccommodate(art) && !box.isAtCapacity()) {
          if (box.addArt(art)) {
            placed = true;
            break;
          }
        }
      }

      // If not placed, create a new box
      if (!placed) {
        const newBox = new Box();
        if (newBox.canAccommodate(art)) {
          if (newBox.addArt(art)) {
            boxes.push(newBox);
            placed = true;
          }
        }
      }

      // If still not placed, add to unassigned
      if (!placed) {
        unassignedArt.push(art);
      }
    }

    const totalWeight = boxes.reduce((sum, box) => sum + box.getTotalWeight(), 0);
    const packingEfficiency = this.calculatePackingEfficiency(boxes, artItems.length);

    return {
      boxes,
      unassignedArt,
      packingEfficiency,
      totalWeight
    };
  }

  private calculatePackingEfficiency(boxes: Box[], totalItems: number): number {
    if (totalItems === 0) return 1.0;
    
    const packedItems = boxes.reduce((sum, box) => sum + box.getContents().length, 0);
    return packedItems / totalItems;
  }
}

/**
 * Best-fit algorithm for box packing.
 * Places each item in the box with the least remaining capacity that can still accommodate it.
 */
export class BestFitBoxPacking implements BoxPackingStrategy {
  pack(artItems: Art[], availableBoxes: Box[] = []): BoxPackingResult {
    const boxes = [...availableBoxes];
    const unassignedArt: Art[] = [];

    // Sort art items by weight (heaviest first) for stability
    // Also consider fragile items for special handling
    const sortedArt = [...artItems].sort((a, b) => {
      const aFragile = this.isFragileItem(a);
      const bFragile = this.isFragileItem(b);
      
      // Fragile items get priority placement
      if (aFragile && !bFragile) return -1;
      if (!aFragile && bFragile) return 1;
      
      // Then by weight for stability
      return b.getWeight() - a.getWeight();
    });

    for (const art of sortedArt) {
      let bestBox: Box | null = null;
      let minRemainingCapacity = Infinity;

      // Find the box with minimum remaining capacity that can accommodate the art
      for (const box of boxes) {
        if (box.canAccommodate(art) && !box.isAtCapacity()) {
          const remainingCapacity = box.getRemainingCapacity();
          if (remainingCapacity < minRemainingCapacity) {
            minRemainingCapacity = remainingCapacity;
            bestBox = box;
          }
        }
      }

      let placed = false;
      if (bestBox && bestBox.addArt(art)) {
        placed = true;
      } else {
        // Create new box if no suitable box found
        const newBox = new Box();
        if (newBox.canAccommodate(art) && newBox.addArt(art)) {
          boxes.push(newBox);
          placed = true;
        }
      }

      if (!placed) {
        unassignedArt.push(art);
      }
    }

    const totalWeight = boxes.reduce((sum, box) => sum + box.getTotalWeight(), 0);
    const packingEfficiency = this.calculatePackingEfficiency(boxes, artItems.length);

    return {
      boxes,
      unassignedArt,
      packingEfficiency,
      totalWeight
    };
  }

  pack(boxes: Box[], availableCrates: Crate[] = []): CratePackingResult {
    const crates = [...availableCrates];
    const unassignedBoxes: Box[] = [];

    // Sort boxes by weight (heaviest first) for better stability
    const sortedBoxes = [...boxes].sort((a, b) => b.getTotalWeight() - a.getTotalWeight());

    for (const box of sortedBoxes) {
      let placed = false;

      // Try to place in existing crates first
      for (const crate of crates) {
        if (crate.canAccommodate(box) && !crate.isAtCapacity()) {
          if (crate.addBox(box)) {
            placed = true;
            break;
          }
        }
      }

      // If not placed, create a new crate
      if (!placed) {
        const newCrate = new Crate();
        if (newCrate.canAccommodate(box)) {
          if (newCrate.addBox(box)) {
            crates.push(newCrate);
            placed = true;
          }
        }
      }

      if (!placed) {
        unassignedBoxes.push(box);
      }
    }

    const totalWeight = crates.reduce((sum, crate) => sum + crate.calculateWeight(0), 0);
    const packingEfficiency = this.calculatePackingEfficiency(crates, boxes.length);

    return {
      crates,
      unassignedBoxes,
      packingEfficiency,
      totalWeight
    };
  }

  private calculatePackingEfficiency(crates: Crate[], totalBoxes: number): number {
    if (totalBoxes === 0) return 1.0;
    
    const packedBoxes = crates.reduce((sum, crate) => sum + crate.getContents().length, 0);
    return packedBoxes / totalBoxes;
  }
}

/**
 * Hybrid packing algorithm that tries multiple strategies and selects the best result.
 */
export class HybridPackingAlgorithm {
  private boxStrategies: BoxPackingStrategy[] = [
    new FirstFitDecreasingBoxPacking(),
    new BestFitBoxPacking()
  ];

  private crateStrategies: CratePackingStrategy[] = [
    new FirstFitCratePacking()
  ];

  packBoxes(artItems: Art[]): BoxPackingResult {
    let bestResult: BoxPackingResult | null = null;
    let bestScore = -1;

    for (const strategy of this.boxStrategies) {
      const result = strategy.pack(artItems);
      const score = this.scoreBoxPackingResult(result);

      if (score > bestScore) {
        bestScore = score;
        bestResult = result;
      }
    }

    return bestResult || {
      boxes: [],
      unassignedArt: [...artItems],
      packingEfficiency: 0,
      totalWeight: 0
    };
  }

  packCrates(boxes: Box[]): CratePackingResult {
    let bestResult: CratePackingResult | null = null;
    let bestScore = -1;

    for (const strategy of this.crateStrategies) {
      const result = strategy.pack(boxes);
      const score = this.scoreCratePackingResult(result);

      if (score > bestScore) {
        bestScore = score;
        bestResult = result;
      }
    }

    return bestResult || {
      crates: [],
      unassignedBoxes: [...boxes],
      packingEfficiency: 0,
      totalWeight: 0
    };
  }

  private scoreBoxPackingResult(result: BoxPackingResult): number {
    // Score based on packing efficiency and minimizing number of boxes
    const efficiencyScore = result.packingEfficiency * 100;
    const boxCountPenalty = result.boxes.length * 2;
    const unassignedPenalty = result.unassignedArt.length * 50;

    return efficiencyScore - boxCountPenalty - unassignedPenalty;
  }

  private scoreCratePackingResult(result: CratePackingResult): number {
    // Score based on packing efficiency and minimizing number of crates
    const efficiencyScore = result.packingEfficiency * 100;
    const crateCountPenalty = result.crates.length * 5;
    const unassignedPenalty = result.unassignedBoxes.length * 100;

    return efficiencyScore - crateCountPenalty - unassignedPenalty;
  }
}
