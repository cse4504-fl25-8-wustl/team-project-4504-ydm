export interface WeightSummary {
  totalArtworkWeightLbs: number;
  glassFramedWeightLbs: number;
  oversizedWeightLbs: number;
  packagingWeightLbs: {
    total: number;
    pallets: {
      count: number;
      totalWeight: number;
    };
    crates: {
      count: number;
      totalWeight: number;
    };
  };
  finalShipmentWeightLbs: number;
}

export interface BoxRequirementSummary {
  label: string;
  dimensions: string;
  count: number;
}

export interface ContainerRequirementSummary {
  label: string;
  dimensions: string;
  count: number;
}

export interface PackedContainerDimension {
  containerId: string;
  dimensions: string;
  weightLbs: number;
}

export interface HardwareBreakdown {
  lineItemSummary: Array<{ hardwareLabel: string; totalPieces: number; artQuantity: number }>; 
  totalsByHardwareType: Record<string, number>;
  totalPieces: number;
}

export interface BoxContentsDetail {
  boxNumber: number;
  boxType: string;
  contents: Array<{
    productType: string;
    quantity: number;
    itemIds: string[];
  }>;
  totalPieces: number;
  specialHandling: string[];
  packingInstructions: string[];
  label: string;
}

export interface PackingSummary {
  boxRequirements: BoxRequirementSummary[];
  containerRequirements: ContainerRequirementSummary[];
  packedContainerDimensions: PackedContainerDimension[];
  hardware: HardwareBreakdown;
  boxContents: BoxContentsDetail[];
}

export interface OversizedItemFlag {
  dimensions: string;
  quantity: number;
  recommendation: string;
}

export interface OversizedPieceDetail {
  dimensions: string;
  quantity: number;
  weightLbs: number;
}

export interface WorkOrderSummary {
  totalPieces: number;
  standardSizePieces: number;
  oversizedPieces: number;
  oversizedDetails: OversizedPieceDetail[];
}

export interface BusinessIntelligenceSummary {
  clientRulesApplied: string[];
  oversizedItems: OversizedItemFlag[];
  mediumsToFlag: string[];
  alternativeRecommendations: string[];
  riskFlags: string[];
}

export interface FreightExportSummary {
  subject: string;
  shipmentDetails: string[];
}

export interface PackagingResponseMetadata {
  warnings: string[];
  errors: string[];
  algorithmUsed: string;
  processingTimeMs: number;
  timestamp: string;
}

export interface PackagingResponse {
  workOrderSummary: WorkOrderSummary;
  weightSummary: WeightSummary;
  packingSummary: PackingSummary;
  businessIntelligence: BusinessIntelligenceSummary;
  freightExport: FreightExportSummary;
  metadata: PackagingResponseMetadata;
}
