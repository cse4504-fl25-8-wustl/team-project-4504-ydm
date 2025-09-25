/**
 * Output DTO for packing calculation results
 * Matches the required output format from project specifications
 */

export interface PackOutputDTO {
  // Project summary
  workOrder: string;
  clientName: string;
  totalPieces: number;
  
  // Weight summary
  weightSummary: {
    totalArtworkWeight: number; // lbs
    totalPackagingWeight: number; // lbs
    finalShipmentWeight: number; // lbs
    weightBreakdown: {
      glassFramedPrints?: number;
      oversizedPieces?: number;
      pallets?: number;
      crates?: number;
    };
  };
  
  // Packing summary
  packingSummary: {
    boxRequirements: {
      standardBoxes: number; // 37"×11"×31"
      largeBoxes: number; // 44"×13"×48"
      totalBoxes: number;
    };
    containerRequirements: {
      standardPallets: number; // 48"×40"
      oversizePallets: number; // 60"×40"
      crates: number;
    };
    finalDimensions: PackedContainer[];
    hardwareCalculation: HardwareSummary;
  };
  
  // Business intelligence
  businessIntelligence: {
    clientSpecificRulesApplied: string[];
    oversizedItemsFlagged: OversizedItem[];
    specialFinalMediumsFlagged: SpecialMedium[];
    alternativeRecommendations: string[];
    riskFlags: string[];
  };
  
  // Freight carrier export
  freightCarrierExport: {
    subject: string;
    shipmentDetails: {
      totalWeight: number;
      pieces: number;
      dimensions: string;
      pickup: string;
      delivery: string;
      specialRequirements: string[];
    };
  };
  
  // Cost information
  cost: {
    estimatedCost: number;
    costBreakdown: CostBreakdown;
    variance?: number; // vs actual if available
  };
  
  // Detailed packing results
  items: PackedItem[];
  boxes: PackedBox[];
  containers: PackedContainer[];
}

export interface PackedItem {
  lineNumber: number;
  tagNumber: number;
  quantity: number;
  finalMedium: string;
  dimensions: {
    width: number;
    height: number;
  };
  weight: number;
  materialType: string;
  isOversized: boolean;
  requiresLargeBox: boolean;
  glazing?: string;
  hardware?: string;
}

export interface PackedBox {
  id: string;
  type: "standard" | "large" | "ups-small" | "ups-large";
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  items: PackedItem[];
  totalWeight: number;
  piecesCount: number;
}

export interface PackedContainer {
  id: string;
  type: "standard-pallet" | "oversize-pallet" | "glass-small-pallet" | "crate";
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  weight: number;
  boxes: PackedBox[];
  totalWeight: number;
}

export interface HardwareSummary {
  lineItemHardware: Array<{
    hardwareType: string;
    quantity: number;
  }>;
  wallHardwareNeeded: {
    drywallAnchors: number;
    screws: number;
    tBolts: number;
  };
}

export interface OversizedItem {
  dimensions: string;
  quantity: number;
  weight: number;
  requiresLargeBox: boolean;
}

export interface SpecialMedium {
  finalMedium: string;
  quantity: number;
  url?: string; // for Wall Decor items
  isHighValue: boolean; // for Commissions
}

export interface CostBreakdown {
  artworkWeight: number;
  packagingWeight: number;
  shippingCost: number;
  handlingCost: number;
  totalCost: number;
}
