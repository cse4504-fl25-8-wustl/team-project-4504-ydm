/**
 * Input DTO for packing calculation requests
 * Based on Excel data format and project requirements
 */

export interface PackInputDTO {
  // Project metadata
  workOrder: string;
  clientName: string;
  jobSiteLocation: string;
  
  // Delivery capabilities
  deliveryCapabilities: {
    acceptsPallets: boolean;
    acceptsCrates: boolean;
    loadingDockAccess: boolean;
    liftgateRequired: boolean;
    insideDeliveryNeeded: boolean;
  };
  
  // Service type
  serviceType: "Delivery + Installation" | "Delivery Only" | "Pickup Only";
  
  // Items to pack
  items: PackItemInput[];
}

export interface PackItemInput {
  lineNumber: number;
  quantity: number;
  tagNumber: number;
  finalMedium: string; // e.g., "Paper Print - Framed", "Canvas - Float Frame"
  outsideSizeWidth: number; // inches
  outsideSizeHeight: number; // inches
  glazing?: string; // e.g., "Regular Glass", "Acrylic", or empty for no glazing
  frame1Moulding?: string; // e.g., "475130-BX"
  hardware?: string; // e.g., "4 pt Sec", "3 pt Sec"
}

// Material weight constants (lbs per square inch)
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
