
/**
 * Catalog Data Provider - Student 3
 * 
 * Provides comprehensive catalog data for boxes, pallets, crates, and materials
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MaterialWeight {
  material: string;
  weightPerSqIn: number; // pounds per square inch
  description: string;
}

export interface BoxType {
  id: string;
  name: string;
  dimensions: {
    length: number; // inches
    width: number;  // inches
    height: number; // inches
  };
  weight: number; // tare weight in pounds
  maxCapacity: {
    standardPallet: number; // boxes per 48"×40" pallet
    oversizePallet?: number; // boxes per 60"×40" pallet
  };
  usageRules: string[];
  shippingMethod: 'pallet' | 'ups' | 'both';
}

export interface PalletType {
  id: string;
  name: string;
  dimensions: {
    length: number; // inches
    width: number;  // inches
  };
  weight: number; // tare weight in pounds
  maxBoxCapacity: number;
  usageRules: string[];
}

export interface CrateType {
//<<<<<<< student3-catalog-utilities
  id: string;
  name: string;
  baseDimensions: {
    length: number; // inches
    width: number;  // inches
  };
  weight: number; // base tare weight in pounds
  heightCalculation: string; // formula for height
  usageRules: string[];
  maxDimension: number; // max artwork dimension that fits
}

export interface PackingRule {
  materialType: string;
  shippingMethod: 'pallet' | 'crate';
  piecesPerContainer: {
    standard: number; // <33" both dimensions
    oversized?: number; // >33" either dimension
  };
  specialRules?: string[];
}

export interface ClientRule {
  clientName: string;
  restrictions: string[];
  specialPacking?: {
    materialType: string;
    piecesPerBox: number;
  }[];
  deliveryPreferences: string[];
}

// ============================================================================
// MATERIAL WEIGHT REFERENCE DATA
// ============================================================================

export const MATERIAL_WEIGHTS: MaterialWeight[] = [
  {
    material: 'GLASS',
    weightPerSqIn: 0.0098,
    description: 'Regular glass glazing for framed prints'
  },
  {
    material: 'ACRYLIC',
    weightPerSqIn: 0.0094,
    description: 'Acrylic glazing alternative to glass'
  },
  {
    material: 'CANVAS-Framed',
    weightPerSqIn: 0.0085,
    description: 'Canvas prints with framing'
  },
  {
    material: 'CANVAS-Gallery',
    weightPerSqIn: 0.0061,
    description: 'Gallery wrapped canvas without frame'
  },
  {
    material: 'MIRROR',
    weightPerSqIn: 0.0191,
    description: 'Mirror products - highest weight category'
  },
  {
    material: 'ACOUSTIC PANEL',
    weightPerSqIn: 0.0038,
    description: 'Acoustic panels without framing'
  },
  {
    material: 'ACOUSTIC PANEL-framed',
    weightPerSqIn: 0.0037,
    description: 'Framed acoustic panels'
  },
  {
    material: 'PATIENT BOARD',
    weightPerSqIn: 0.0347,
    description: 'Patient information boards - heaviest category'
  }
];

// ============================================================================
// BOX SPECIFICATIONS
// ============================================================================

export const BOX_TYPES: BoxType[] = [
  {
    id: 'standard',
    name: 'Standard Box',
    dimensions: { length: 37, width: 11, height: 31 },
    weight: 2, // estimated tare weight
    maxCapacity: {
      standardPallet: 4, // 4 per 48"×40" pallet
      oversizePallet: 5   // 5 per 60"×40" pallet
    },
    usageRules: [
      'Most common size for standard artwork',
      'Use when both dimensions ≤36 inches',
      'Preferred for glass/acrylic framed pieces'
    ],
    shippingMethod: 'pallet'
  },
  {
    id: 'large',
    name: 'Large Box',
    dimensions: { length: 44, width: 13, height: 48 },
    weight: 3, // estimated tare weight
    maxCapacity: {
      standardPallet: 3, // 3 per 48"×40" pallet
      oversizePallet: 4   // 4 per 60"×40" pallet
    },
    usageRules: [
      'Required when ANY dimension >36 inches',
      'Maximum capacity: 43.5" in both directions',
      'Used for oversized artwork'
    ],
    shippingMethod: 'pallet'
  },
  {
    id: 'ups-small',
    name: 'UPS Small',
    dimensions: { length: 36, width: 6, height: 36 },
    weight: 1, // estimated tare weight
    maxCapacity: {
      standardPallet: 0 // UPS only, not palletized
    },
    usageRules: [
      'Small orders and replacements only',
      'Direct UPS shipping',
      'Not suitable for pallet shipping'
    ],
    shippingMethod: 'ups'
  },
  {
    id: 'ups-large',
    name: 'UPS Large',
    dimensions: { length: 44, width: 6, height: 35 },
    weight: 1.5, // estimated tare weight
    maxCapacity: {
      standardPallet: 0 // UPS only, not palletized
    },
    usageRules: [
      'Adjustable length for UPS shipping',
      'Direct UPS shipping only',
      'Not suitable for pallet shipping'
    ],
    shippingMethod: 'ups'
  }
];

// ============================================================================
// PALLET SPECIFICATIONS
// ============================================================================

export const PALLET_TYPES: PalletType[] = [
  {
    id: 'standard',
    name: 'Standard Pallet',
    dimensions: { length: 48, width: 40 },
    weight: 60,
    maxBoxCapacity: 4,
    usageRules: [
      'Most common pallet size',
      'Fits 4 standard boxes or 3 large boxes',
      'Standard LTL freight compatibility'
    ]
  },
  {
    id: 'glass-small',
    name: 'Glass Small Pallet',
    dimensions: { length: 43, width: 35 },
    weight: 60,
    maxBoxCapacity: 2,
    usageRules: [
      'Used for small glass shipments',
      'Reduced footprint for light loads',
      'Specialized for fragile items'
    ]
  },
  {
    id: 'oversize',
    name: 'Oversize Pallet',
    dimensions: { length: 60, width: 40 },
    weight: 75,
    maxBoxCapacity: 5,
    usageRules: [
      'For oversized artwork that won\'t fit standard pallets',
      'Fits 5 standard boxes or 4 large boxes',
      'May incur oversized freight charges'
    ]
  }
];

// ============================================================================
// CRATE SPECIFICATIONS
// ============================================================================

export const CRATE_TYPES: CrateType[] = [
  {
    id: 'standard',
    name: 'Standard Crate',
    baseDimensions: { length: 50, width: 38 },
    weight: 125,
    heightCalculation: 'largest_dimension + 8',
    maxDimension: 46,
    usageRules: [
      'Most protective shipping option',
      'Custom height based on artwork',
      'Won\'t fit artwork >46" in any dimension',
      'Preferred for high-value pieces'
    ]
  },
  {
    id: 'custom',
    name: 'Custom Crate',
    baseDimensions: { length: 0, width: 0 }, // calculated per job
    weight: 150, // base weight, varies by size
    heightCalculation: 'custom_per_artwork',
    maxDimension: 102, // LTL freight limit
    usageRules: [
      'Required for artwork >46" in any dimension',
      'Custom dimensions per project',
      'Highest protection level',
      'Most expensive shipping option'
    ]
  }
];

// ============================================================================
// PACKING RULES BY MATERIAL TYPE
// ============================================================================

export const PACKING_RULES: PackingRule[] = [
  {
    materialType: 'Glass/Acrylic Framed',
    shippingMethod: 'pallet',
    piecesPerContainer: {
      standard: 6 // pieces per box
    },
    specialRules: [
      'Standard: 6 pieces per box, 4 boxes per pallet = 24 per pallet',
      'Sunrise client: 8 pieces per box (special rule)'
    ]
  },
  {
    materialType: 'Glass/Acrylic Framed',
    shippingMethod: 'crate',
    piecesPerContainer: {
      standard: 25, // <33" both dimensions
      oversized: 18  // >33" either dimension
    }
  },
  {
    materialType: 'Canvas',
    shippingMethod: 'pallet',
    piecesPerContainer: {
      standard: 6 // NOTE: Conflicting rules - Excel says 6, written says 4
    },
    specialRules: [
      'CONFLICT: Excel calculator shows 6 per box, written rules show 4 per box',
      'Using Excel logic: 6 pieces per box = 12 per pallet',
      'Alternative: 4 pieces per box = 16 per pallet',
      'FLAG FOR REVIEW in Friday meeting'
    ]
  },
  {
    materialType: 'Canvas',
    shippingMethod: 'crate',
    piecesPerContainer: {
      standard: 18, // <33" both dimensions
      oversized: 12  // >33" either dimension
    }
  },
  {
    materialType: 'Acoustic Panels',
    shippingMethod: 'pallet',
    piecesPerContainer: {
      standard: 4 // pieces per box
    },
    specialRules: [
      '4 pieces per box, 4 boxes per pallet = 16 per pallet'
    ]
  },
  {
    materialType: 'Mirrors',
    shippingMethod: 'crate',
    piecesPerContainer: {
      standard: 25, // directly in crate, no boxes
      oversized: 24
    },
    specialRules: [
      'Best practice: Use crates for mirrors',
      'Pack directly in crate without boxes',
      'Highest protection due to fragility'
    ]
  }
];

// ============================================================================
// CLIENT-SPECIFIC BUSINESS RULES
// ============================================================================

export const CLIENT_RULES: ClientRule[] = [
  {
    clientName: 'Sunrise',
    restrictions: [
      'NO CRATES - boxes on pallets only',
      'Delivery only (they install themselves)',
      'Dock-to-dock to Virginia warehouse'
    ],
    specialPacking: [
      {
        materialType: 'Glass/Acrylic',
        piecesPerBox: 8 // instead of standard 6
      }
    ],
    deliveryPreferences: [
      'Pallet shipping preferred',
      'No inside delivery needed'
    ]
  },
  {
    clientName: 'MedStar',
    restrictions: [],
    deliveryPreferences: [
      'Loading dock access available',
      'Standard delivery + installation service'
    ]
  }
];

// ============================================================================
// CATALOG PROVIDER FUNCTIONS
// ============================================================================

/**
 * Get material weight data by material type
 */
export function getMaterialWeight(materialType: string): MaterialWeight | null {
  return MATERIAL_WEIGHTS.find(m => 
    m.material.toLowerCase() === materialType.toLowerCase()
  ) || null;
}

/**
 * Get box specifications by type or usage requirements
 */
export function getBoxTypes(filter?: {
  shippingMethod?: 'pallet' | 'ups' | 'both';
  maxDimension?: number;
}): BoxType[] {
  let boxes = BOX_TYPES;
  
  if (filter?.shippingMethod && filter.shippingMethod !== 'both') {
    boxes = boxes.filter(box => 
      box.shippingMethod === filter.shippingMethod || 
      box.shippingMethod === 'both'
    );
  }
  
  if (filter?.maxDimension) {
    const maxDim = filter.maxDimension; // Store in local variable
    boxes = boxes.filter(box => 
      Math.max(box.dimensions.length, box.dimensions.width, box.dimensions.height) 
      >= maxDim
    );
  }
  
  return boxes;
}

/**
 * Get appropriate box type for given artwork dimensions
 */
export function getRecommendedBoxType(
  artworkLength: number, 
  artworkWidth: number
): BoxType {
  const maxDimension = Math.max(artworkLength, artworkWidth);
  
  // Standard box limit: both dimensions ≤36"
  if (artworkLength <= 36 && artworkWidth <= 36) {
    return BOX_TYPES.find(box => box.id === 'standard')!;
  }
  
  // Large box limit: up to 43.5" in both directions
  if (maxDimension <= 43.5) {
    return BOX_TYPES.find(box => box.id === 'large')!;
  }
  
  // Oversized - requires custom pallet or crate
  throw new Error(`Artwork dimensions ${artworkLength}"×${artworkWidth}" exceed large box capacity. Consider crate shipping.`);
}

/**
 * Get pallet specifications
 */
export function getPalletTypes(): PalletType[] {
  return PALLET_TYPES;
}

/**
 * Get crate specifications
 */
export function getCrateTypes(): CrateType[] {
  return CRATE_TYPES;
}

/**
 * Get packing rules for specific material and shipping method
 */
export function getPackingRules(
  materialType: string, 
  shippingMethod: 'pallet' | 'crate'
): PackingRule | null {
  return PACKING_RULES.find(rule => 
    rule.materialType.toLowerCase().includes(materialType.toLowerCase()) &&
    rule.shippingMethod === shippingMethod
  ) || null;
}

/**
 * Get client-specific business rules
 */
export function getClientRules(clientName: string): ClientRule | null {
  return CLIENT_RULES.find(rule => 
    rule.clientName.toLowerCase() === clientName.toLowerCase()
  ) || null;
}

/**
 * Get all catalog data - main export function
 */
export function getCatalogs() {
  return {
    materials: MATERIAL_WEIGHTS,
    boxes: BOX_TYPES,
    pallets: PALLET_TYPES,
    crates: CRATE_TYPES,
    packingRules: PACKING_RULES,
    clientRules: CLIENT_RULES,
    
    // Helper functions
    getMaterialWeight,
    getBoxTypes,
    getRecommendedBoxType,
    getPalletTypes,
    getCrateTypes,
    getPackingRules,
    getClientRules
  };
}

export default getCatalogs;

// pending for review
//export interface CrateType {
// =======
//   id: "standard" | "custom";
//   name: string;
//   baseDimensions: {
//     length: number;
//     width: number;
//   };
//   weight: number;
//   heightCalculation: string;
//   usageRules: string[];
// }

// export interface CatalogData {
//   boxes: BoxType[];
//   pallets: PalletType[];
//   crates: CrateType[];
// }

// const BOXES: BoxType[] = [
//   {
//     id: "standard",
//     name: "Standard Box",
//     dimensions: { length: 37, width: 11, height: 31 },
//     weight: 2,
//     maxCapacity: { standardPallet: 4, oversizePallet: 5 },
//     usageRules: ["Default framed artwork box"],
//     shippingMethod: "pallet",
//   },
//   {
//     id: "large",
//     name: "Large Box",
//     dimensions: { length: 44, width: 13, height: 48 },
//     weight: 3,
//     maxCapacity: { standardPallet: 3, oversizePallet: 4 },
//     usageRules: ["Use when any dimension exceeds 36 inches"],
//     shippingMethod: "pallet",
//   },
//   {
//     id: "ups-small",
//     name: "UPS Small",
//     dimensions: { length: 36, width: 6, height: 36 },
//     weight: 1,
//     maxCapacity: { standardPallet: 0 },
//     usageRules: ["Parcel shipments only"],
//     shippingMethod: "ups",
//   },
//   {
//     id: "ups-large",
//     name: "UPS Large",
//     dimensions: { length: 44, width: 6, height: 35 },
//     weight: 1.5,
//     maxCapacity: { standardPallet: 0 },
//     usageRules: ["Parcel shipments only"],
//     shippingMethod: "ups",
//   },
// ];

// const PALLETS: PalletType[] = [
//   {
//     id: "standard",
//     name: "Standard Pallet",
//     dimensions: { length: 48, width: 40 },
//     weight: 60,
//     maxBoxCapacity: 4,
//     usageRules: ["Default pallet size"],
//   },
//   {
//     id: "glass-small",
//     name: "Glass Small Pallet",
//     dimensions: { length: 43, width: 35 },
//     weight: 60,
//     maxBoxCapacity: 2,
//     usageRules: ["Two glass boxes to minimize movement"],
//   },
//   {
//     id: "oversize",
//     name: "Oversize Pallet",
//     dimensions: { length: 60, width: 40 },
//     weight: 75,
//     maxBoxCapacity: 5,
//     usageRules: ["Large boxes or overflow"],
//   },
// ];

// const CRATES: CrateType[] = [
//   {
//     id: "standard",
//     name: "Standard Crate",
//     baseDimensions: { length: 50, width: 38 },
//     weight: 125,
//     heightCalculation: "largest_dimension + 8",
//     usageRules: ["Default crate"],
//   },
//   {
//     id: "custom",
//     name: "Custom Crate",
//     baseDimensions: { length: 0, width: 0 },
//     weight: 150,
//     heightCalculation: "custom",
//     usageRules: ["Oversize crate"],
//   },
// ];

// export default function getCatalogs(): CatalogData {
//   return {
//     boxes: BOXES,
//     pallets: PALLETS,
//     crates: CRATES,
//   };
// }
//>>>>>>> feature1
