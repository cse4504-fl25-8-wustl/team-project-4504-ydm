/**
 * Cost calculation per ARCH rules
 * Based on weight, packaging, and shipping requirements
 */

import { PackOutputDTO, CostBreakdown } from './dto/PackOutputDTO';

// Cost constants (per ARCH business rules)
const COST_CONSTANTS = {
  // Weight-based shipping rates (per 100 lbs)
  SHIPPING_RATE_PER_100_LBS: 45, // Base rate
  
  // Packaging costs
  STANDARD_BOX_COST: 8,
  LARGE_BOX_COST: 12,
  PALLET_COST: 15,
  CRATE_COST: 25,
  
  // Handling costs
  HANDLING_RATE_PER_100_LBS: 12,
  
  // Special handling fees
  LIFTGATE_FEE: 50,
  INSIDE_DELIVERY_FEE: 75,
  OVERSIZE_FEE: 25, // per oversize pallet
  
  // Client-specific multipliers
  CLIENT_MULTIPLIERS: {
    'sunrise': 0.95, // 5% discount for Sunrise
    'medstar': 1.0,  // Standard rate
    'olg': 1.0,      // Standard rate
  }
} as const;

/**
 * Calculates total cost for a packing solution
 */
export function calculateCost(
  output: PackOutputDTO,
  clientName: string
): CostBreakdown {
  const weight = output.weightSummary.finalShipmentWeight;
  const boxes = output.packingSummary.boxRequirements;
  const containers = output.packingSummary.containerRequirements;
  
  // Base shipping cost (weight-based)
  const shippingCost = Math.ceil(weight / 100) * COST_CONSTANTS.SHIPPING_RATE_PER_100_LBS;
  
  // Packaging costs
  const boxCost = (boxes.standardBoxes * COST_CONSTANTS.STANDARD_BOX_COST) +
                  (boxes.largeBoxes * COST_CONSTANTS.LARGE_BOX_COST);
  
  const containerCost = (containers.standardPallets * COST_CONSTANTS.PALLET_COST) +
                        (containers.oversizePallets * COST_CONSTANTS.PALLET_COST) +
                        (containers.crates * COST_CONSTANTS.CRATE_COST);
  
  // Handling cost
  const handlingCost = Math.ceil(weight / 100) * COST_CONSTANTS.HANDLING_RATE_PER_100_LBS;
  
  // Special fees
  let specialFees = 0;
  
  // Oversize fees
  if (containers.oversizePallets > 0) {
    specialFees += containers.oversizePallets * COST_CONSTANTS.OVERSIZE_FEE;
  }
  
  // Client-specific adjustments
  const clientMultiplier = getClientMultiplier(clientName);
  
  const subtotal = shippingCost + boxCost + containerCost + handlingCost + specialFees;
  const totalCost = subtotal * clientMultiplier;
  
  return {
    artworkWeight: output.weightSummary.totalArtworkWeight,
    packagingWeight: output.weightSummary.totalPackagingWeight,
    shippingCost: Math.round(shippingCost * clientMultiplier),
    handlingCost: Math.round(handlingCost * clientMultiplier),
    totalCost: Math.round(totalCost),
  };
}

/**
 * Gets client-specific cost multiplier
 */
function getClientMultiplier(clientName: string): number {
  const name = clientName.toLowerCase();
  
  for (const [client, multiplier] of Object.entries(COST_CONSTANTS.CLIENT_MULTIPLIERS)) {
    if (name.includes(client)) {
      return multiplier;
    }
  }
  
  return 1.0; // Default multiplier
}

/**
 * Calculates packaging weight based on containers used
 */
export function calculatePackagingWeight(
  standardPallets: number,
  oversizePallets: number,
  crates: number
): number {
  const standardPalletWeight = 60; // lbs
  const oversizePalletWeight = 75; // lbs
  const crateWeight = 125; // lbs
  
  return (standardPallets * standardPalletWeight) +
         (oversizePallets * oversizePalletWeight) +
         (crates * crateWeight);
}

/**
 * Estimates freight cost based on real project examples
 * Uses patterns from WO 21234, 21157, 21074, 20976
 */
export function estimateFreightCost(
  totalWeight: number,
  containerCount: number,
  hasOversize: boolean
): number {
  // Base cost patterns from real projects
  if (totalWeight <= 300) {
    // Small shipments (like WO 20976: 305 lbs)
    return 360;
  } else if (totalWeight <= 500) {
    // Medium shipments (like WO 21074: 250 lbs)
    return 675;
  } else if (totalWeight <= 800) {
    // Large shipments (like WO 21234: 913 lbs)
    return 550;
  } else {
    // Very large shipments (like WO 21157: 1157 lbs)
    return 780;
  }
}

/**
 * Calculates cost variance vs actual (for validation)
 */
export function calculateVariance(estimated: number, actual: number): number {
  return ((estimated - actual) / actual) * 100;
}

/**
 * Determines if cost estimate is within acceptable variance
 */
export function isCostAcceptable(variance: number): boolean {
  return Math.abs(variance) <= 10; // Within 10% is acceptable
}

/**
 * Generates cost summary for business intelligence
 */
export function generateCostSummary(
  breakdown: CostBreakdown,
  actualCost?: number
): {
  estimatedCost: number;
  actualCost?: number;
  variance?: number;
  isAcceptable: boolean;
  costPerPound: number;
  recommendations: string[];
} {
  const costPerPound = breakdown.totalCost / (breakdown.artworkWeight + breakdown.packagingWeight);
  
  const recommendations: string[] = [];
  
  if (costPerPound > 1.5) {
    recommendations.push('Consider alternative shipping methods to reduce cost per pound');
  }
  
  if (breakdown.packagingWeight > breakdown.artworkWeight * 0.2) {
    recommendations.push('High packaging weight ratio - consider optimizing container selection');
  }
  
  let variance: number | undefined;
  let isAcceptable = true;
  
  if (actualCost) {
    variance = calculateVariance(breakdown.totalCost, actualCost);
    isAcceptable = isCostAcceptable(variance);
  }
  
  return {
    estimatedCost: breakdown.totalCost,
    actualCost,
    variance,
    isAcceptable,
    costPerPound: Math.round(costPerPound * 100) / 100,
    recommendations,
  };
}
