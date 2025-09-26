import { MaterialType } from "./PackInputDTO";

export interface PackOutputDTO {
  workOrder: string;
  clientName: string;
  totalPieces: number;
  weightSummary: {
    totalArtworkWeight: number;
    totalPackagingWeight: number;
    finalShipmentWeight: number;
    weightBreakdown: {
      glassFramedPrints?: number;
      oversizedPieces?: number;
      pallets?: number;
      crates?: number;
    };
  };
  packingSummary: {
    boxRequirements: {
      standardBoxes: number;
      largeBoxes: number;
      totalBoxes: number;
    };
    containerRequirements: {
      standardPallets: number;
      oversizePallets: number;
      crates: number;
    };
    finalDimensions: PackedContainer[];
    hardwareCalculation: {
      lineItemHardware: Array<{
        hardwareType: string;
        quantity: number;
      }>;
      wallHardwareNeeded: {
        drywallAnchors: number;
        screws: number;
        tBolts: number;
      };
    };
  };
  businessIntelligence: {
    clientSpecificRulesApplied: string[];
    oversizedItemsFlagged: Array<{
      dimensions: string;
      quantity: number;
      weight: number;
      requiresLargeBox: boolean;
    }>;
    specialFinalMediumsFlagged: Array<{
      finalMedium: string;
      quantity: number;
      url?: string;
      isHighValue: boolean;
    }>;
    alternativeRecommendations: string[];
    riskFlags: string[];
  };
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
  cost: {
    estimatedCost: number;
    costBreakdown: CostBreakdown;
    variance?: number;
  };
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
  materialType: MaterialType;
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
  items: Array<{
    lineNumber: number;
    tagNumber: number;
    quantity: number;
    finalMedium: string;
    weight: number;
    materialType: MaterialType;
    isOversized: boolean;
    requiresLargeBox: boolean;
    glazing?: string;
    hardware?: string;
  }>;
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

export interface CostBreakdown {
  artworkWeight: number;
  packagingWeight: number;
  shippingCost: number;
  handlingCost: number;
  totalCost: number;
}
