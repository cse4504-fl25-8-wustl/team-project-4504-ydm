import { Box } from "../entities/Box";
import { Crate } from "../entities/Crate";
import { Art, ArtType } from "../entities/Art";
import { DeliveryCapabilities } from "../requests/PackagingRequest";
import { ContainerType } from "../responses/PackagingResponse";

/**
 * Container selection criteria based on delivery capabilities and shipment characteristics.
 */
export interface ContainerSelectionCriteria {
  deliveryCapabilities: DeliveryCapabilities;
  totalWeight: number;
  totalVolume: number;
  hasFragileItems: boolean;
  requiresSpecialHandling: boolean;
}

/**
 * Container recommendation with reasoning.
 */
export interface ContainerRecommendation {
  containerType: ContainerType;
  reasoning: string[];
  priority: number; // Higher is better
  estimatedCost: number;
}

/**
 * Optimizes container selection based on delivery capabilities and shipment characteristics.
 */
export class ContainerOptimizer {
  /**
   * Determines the optimal container type based on delivery capabilities and shipment requirements.
   */
  selectOptimalContainer(criteria: ContainerSelectionCriteria): ContainerRecommendation[] {
    const recommendations: ContainerRecommendation[] = [];

    // Evaluate crate option
    if (criteria.deliveryCapabilities.acceptsCrates) {
      recommendations.push(this.evaluateCrateOption(criteria));
    }

    // Evaluate pallet option
    if (criteria.deliveryCapabilities.acceptsPallets) {
      recommendations.push(this.evaluatePalletOption(criteria));
    }

    // Sort by priority (highest first)
    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Optimizes the packing of boxes into containers based on delivery constraints.
   */
  optimizeContainerPacking(
    boxes: Box[],
    criteria: ContainerSelectionCriteria
  ): ContainerPackingResult {
    const recommendations = this.selectOptimalContainer(criteria);
    
    if (recommendations.length === 0) {
      return {
        containers: [],
        unassignedBoxes: [...boxes],
        containerType: "CRATE", // Default fallback
        totalCost: 0,
        reasoning: ["No suitable container types available based on delivery capabilities"],
        packingEfficiency: 0,
        totalWeight: 0
      };
    }

    const bestRecommendation = recommendations[0];
    
    // Pack boxes into the recommended container type
    if (bestRecommendation.containerType === "CRATE") {
      return this.packIntoCrates(boxes, criteria, bestRecommendation);
    } else {
      return this.packIntoPallets(boxes, criteria, bestRecommendation);
    }
  }

  private evaluateCrateOption(criteria: ContainerSelectionCriteria): ContainerRecommendation {
    const reasoning: string[] = [];
    let priority = 50; // Base priority
    let estimatedCost = 25; // Base crate cost

    // Advantages of crates
    if (criteria.hasFragileItems) {
      reasoning.push("Crates provide better protection for fragile items (tactile panels, special handling items)");
      priority += 20;
    }

    if (criteria.requiresSpecialHandling) {
      reasoning.push("Crates allow for custom padding and protection for special handling items");
      priority += 15;
    }

    if (!criteria.deliveryCapabilities.hasLoadingDock) {
      reasoning.push("Crates are easier to handle without loading dock");
      priority += 10;
    }

    if (criteria.deliveryCapabilities.needsInsideDelivery) {
      reasoning.push("Crates are more manageable for inside delivery");
      priority += 15;
    }

    // Weight considerations
    if (criteria.totalWeight < 500) {
      reasoning.push("Lower weight shipment suitable for crate handling");
      priority += 5;
    } else if (criteria.totalWeight > 1500) {
      reasoning.push("Heavy shipment may be challenging for crate handling");
      priority -= 10;
      estimatedCost += 15;
    }

    // Liftgate considerations
    if (criteria.deliveryCapabilities.requiresLiftgate) {
      reasoning.push("Crates compatible with liftgate delivery");
      priority += 5;
    }

    return {
      containerType: "CRATE",
      reasoning,
      priority,
      estimatedCost
    };
  }

  private evaluatePalletOption(criteria: ContainerSelectionCriteria): ContainerRecommendation {
    const reasoning: string[] = [];
    let priority = 60; // Base priority (slightly higher than crates)
    let estimatedCost = 15; // Base pallet cost (typically cheaper)

    // Advantages of pallets
    if (criteria.deliveryCapabilities.hasLoadingDock) {
      reasoning.push("Loading dock available for efficient pallet handling");
      priority += 25;
    }

    if (criteria.totalWeight > 1000) {
      reasoning.push("Heavy shipment well-suited for pallet transport");
      priority += 20;
    }

    if (!criteria.deliveryCapabilities.needsInsideDelivery) {
      reasoning.push("Dock delivery optimal for pallet shipments");
      priority += 15;
    }

    // Volume efficiency
    if (criteria.totalVolume > 50) { // Assuming cubic feet
      reasoning.push("Large volume shipment benefits from pallet efficiency");
      priority += 10;
    }

    // Disadvantages
    if (criteria.deliveryCapabilities.needsInsideDelivery) {
      reasoning.push("Inside delivery challenging with pallets");
      priority -= 20;
    }

    if (!criteria.deliveryCapabilities.hasLoadingDock) {
      reasoning.push("No loading dock makes pallet handling difficult");
      priority -= 25;
    }

    if (criteria.hasFragileItems && !criteria.requiresSpecialHandling) {
      reasoning.push("Standard pallet may not provide adequate protection for tactile panels or fragile items");
      priority -= 10;
    }

    // Liftgate considerations
    if (criteria.deliveryCapabilities.requiresLiftgate && criteria.totalWeight > 2000) {
      reasoning.push("Heavy pallet may exceed liftgate capacity");
      priority -= 15;
      estimatedCost += 25;
    }

    return {
      containerType: "PALLET",
      reasoning,
      priority,
      estimatedCost
    };
  }

  private packIntoCrates(
    boxes: Box[],
    criteria: ContainerSelectionCriteria,
    recommendation: ContainerRecommendation
  ): ContainerPackingResult {
    const crates: Crate[] = [];
    const unassignedBoxes: Box[] = [];

    // Sort boxes by weight (heaviest first) for better stability
    const sortedBoxes = [...boxes].sort((a, b) => b.getTotalWeight() - a.getTotalWeight());

    for (const box of sortedBoxes) {
      let placed = false;

      // Try to place in existing crates
      for (const crate of crates) {
        if (crate.canAccommodate(box) && !crate.isAtCapacity()) {
          if (crate.addBox(box)) {
            placed = true;
            break;
          }
        }
      }

      // Create new crate if needed
      if (!placed) {
        const newCrate = new Crate();
        if (newCrate.canAccommodate(box) && newCrate.addBox(box)) {
          crates.push(newCrate);
          placed = true;
        }
      }

      if (!placed) {
        unassignedBoxes.push(box);
      }
    }

    const totalCost = crates.length * recommendation.estimatedCost;
    const totalWeight = crates.reduce((sum, crate) => sum + crate.calculateWeight(50), 0);
    const packingEfficiency = boxes.length > 0 ? (boxes.length - unassignedBoxes.length) / boxes.length : 1.0;

    return {
      containers: crates,
      unassignedBoxes,
      containerType: "CRATE",
      totalCost,
      reasoning: recommendation.reasoning,
      packingEfficiency,
      totalWeight
    };
  }

  private packIntoPallets(
    boxes: Box[],
    criteria: ContainerSelectionCriteria,
    recommendation: ContainerRecommendation
  ): ContainerPackingResult {
    // For this implementation, we'll treat pallets as a special type of crate
    // In a real system, you might have a separate Pallet class
    const pallets: Crate[] = [];
    const unassignedBoxes: Box[] = [];

    // Sort boxes by weight for optimal pallet loading
    const sortedBoxes = [...boxes].sort((a, b) => b.getTotalWeight() - a.getTotalWeight());

    for (const box of sortedBoxes) {
      let placed = false;

      // Try to place in existing pallets
      for (const pallet of pallets) {
        if (pallet.canAccommodate(box) && !pallet.isAtCapacity()) {
          if (pallet.addBox(box)) {
            placed = true;
            break;
          }
        }
      }

      // Create new pallet if needed
      if (!placed) {
        const newPallet = new Crate(); // Using Crate as pallet for now
        if (newPallet.canAccommodate(box) && newPallet.addBox(box)) {
          pallets.push(newPallet);
          placed = true;
        }
      }

      if (!placed) {
        unassignedBoxes.push(box);
      }
    }

    const totalCost = pallets.length * recommendation.estimatedCost;
    const totalWeight = pallets.reduce((sum, pallet) => sum + pallet.calculateWeight(75), 0);
    const packingEfficiency = boxes.length > 0 ? (boxes.length - unassignedBoxes.length) / boxes.length : 1.0;

    return {
      containers: pallets,
      unassignedBoxes,
      containerType: "PALLET",
      totalCost,
      reasoning: recommendation.reasoning,
      packingEfficiency,
      totalWeight
    };
  }
}

/**
 * Result of container packing optimization.
 */
export interface ContainerPackingResult {
  containers: Crate[]; // Could be crates or pallets
  unassignedBoxes: Box[];
  containerType: ContainerType;
  totalCost: number;
  reasoning: string[];
  packingEfficiency: number;
  totalWeight: number;
}
