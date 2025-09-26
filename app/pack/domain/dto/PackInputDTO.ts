export interface PackInputDTO {
  workOrder: string;
  clientName: string;
  jobSiteLocation: string;
  deliveryCapabilities: {
    acceptsPallets: boolean;
    acceptsCrates: boolean;
    loadingDockAccess: boolean;
    liftgateRequired: boolean;
    insideDeliveryNeeded: boolean;
  };
  serviceType: "Delivery + Installation" | "Delivery Only" | "Pickup Only";
  items: PackItemInput[];
}

export interface PackItemInput {
  lineNumber: number;
  quantity: number;
  tagNumber: number;
  finalMedium: string;
  outsideSizeWidth: number;
  outsideSizeHeight: number;
  glazing?: string;
  frame1Moulding?: string;
  hardware?: string;
  piecesPerSet?: number;
}

export const MATERIAL_WEIGHTS = {
  GLASS: 0.0098,
  ACRYLIC: 0.0094,
  "CANVAS-FRAMED": 0.0085,
  "CANVAS-GALLERY": 0.0061,
  MIRROR: 0.0191,
  "ACOUSTIC-PANEL": 0.0038,
  "ACOUSTIC-PANEL-FRAMED": 0.0037,
  "PATIENT-BOARD": 0.0347,
} as const;

export type MaterialType = keyof typeof MATERIAL_WEIGHTS;
