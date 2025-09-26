
/**
 * Zod validation schemas for input normalization
 * Ensures data integrity and proper formatting
 */

import { z } from 'zod';
import { PackInputDTO, PackItemInput, MATERIAL_WEIGHTS } from './dto/PackInputDTO';

// Material type validation
const materialTypeSchema = z.enum([
  'GLASS',
  'ACRYLIC', 
  'CANVAS-FRAMED',
  'CANVAS-GALLERY',
  'MIRROR',
  'ACOUSTIC-PANEL',
  'ACOUSTIC-PANEL-FRAMED',
  'PATIENT-BOARD'
] as const);

// Individual item validation
const packItemInputSchema = z.object({
  lineNumber: z.number().int().positive(),
  quantity: z.number().int().positive(),
  tagNumber: z.number().int().positive(),
  finalMedium: z.string().min(1),
  outsideSizeWidth: z.number().positive().max(120), // Max reasonable size
  outsideSizeHeight: z.number().positive().max(120),
  glazing: z.string().optional(),
  frame1Moulding: z.string().optional(),
  hardware: z.string().optional(),
});

// Delivery capabilities validation
const deliveryCapabilitiesSchema = z.object({
  acceptsPallets: z.boolean(),
  acceptsCrates: z.boolean(),
  loadingDockAccess: z.boolean(),
  liftgateRequired: z.boolean(),
  insideDeliveryNeeded: z.boolean(),
});

// Main input validation
export const packInputDTOSchema = z.object({
  workOrder: z.string().min(1),
  clientName: z.string().min(1),
  jobSiteLocation: z.string().min(1),
  deliveryCapabilities: deliveryCapabilitiesSchema,
  serviceType: z.enum(['Delivery + Installation', 'Delivery Only', 'Pickup Only']),
  items: z.array(packItemInputSchema).min(1),
});

/**
 * Validates and normalizes input data
 */
export function validatePackInput(input: unknown): PackInputDTO {
  const result = packInputDTOSchema.safeParse(input);
  
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  
  return result.data;
}

/**
 * Determines material type from final medium and glazing
 */
export function determineMaterialType(finalMedium: string, glazing?: string): keyof typeof MATERIAL_WEIGHTS {
  const medium = finalMedium.toLowerCase();
  
  // Check for specific material types
  if (medium.includes('mirror')) return 'MIRROR';
  if (medium.includes('acoustic')) {
    return medium.includes('framed') ? 'ACOUSTIC-PANEL-FRAMED' : 'ACOUSTIC-PANEL';
  }
  if (medium.includes('patient board')) return 'PATIENT-BOARD';
  
  // Canvas types
  if (medium.includes('canvas')) {
    return medium.includes('gallery') ? 'CANVAS-GALLERY' : 'CANVAS-FRAMED';
  }
  
  // Glass/Acrylic determination
  if (glazing) {
    const glazingLower = glazing.toLowerCase();
    if (glazingLower.includes('acrylic')) return 'ACRYLIC';
    if (glazingLower.includes('glass')) return 'GLASS';
  }
  
  // Default to glass for framed items with glazing
  if (medium.includes('framed') && glazing) return 'GLASS';
  
  // Default to canvas-framed for items without glazing
  return 'CANVAS-FRAMED';
}

/**
 * Calculates item weight based on dimensions and material
 */
export function calculateItemWeight(
  width: number,
  height: number,
  materialType: keyof typeof MATERIAL_WEIGHTS,
  quantity: number = 1
): number {
  const area = width * height;
  const weightPerSqIn = MATERIAL_WEIGHTS[materialType];
  return area * weightPerSqIn * quantity;
}

/**
 * Determines if an item is oversized (truly large items that need special handling)
 */
export function isOversized(width: number, height: number): boolean {
  return width > 43.5 || height > 43.5;
}

/**
 * Determines if an item requires a large box
 */
export function requiresLargeBox(width: number, height: number): boolean {
  return width > 36 || height > 36;
}

/**
 * Determines if an item requires a crate (won't fit in standard containers)
 */
export function requiresCrate(width: number, height: number): boolean {
  return width > 46 || height > 46;
}

/**
 * Normalizes dimensions to standard precision
 */
export function normalizeDimensions(width: number, height: number): { width: number; height: number } {
  return {
    width: Math.round(width * 1000) / 1000, // 3 decimal places
    height: Math.round(height * 1000) / 1000,
  };
}

/**
 * Validates business rules for specific clients
 */
export function validateClientRules(clientName: string, deliveryCapabilities: PackInputDTO['deliveryCapabilities']): string[] {
  const rules: string[] = [];
  
  if (clientName.toLowerCase().includes('sunrise')) {
    if (deliveryCapabilities.acceptsCrates) {
      rules.push('Sunrise client: NO CRATES - boxes on pallets only');
    }
    rules.push('Sunrise client: Delivery only (they install themselves)');
    rules.push('Sunrise client: Dock-to-dock to Virginia warehouse');
  }
  
  return rules;
}

/**
 * Determines pieces per box based on material type
 */
export function getPiecesPerBox(materialType: keyof typeof MATERIAL_WEIGHTS): number {
  switch (materialType) {
    case 'GLASS':
    case 'ACRYLIC':
      return 6; // Standard glass/acrylic framed
    case 'CANVAS-FRAMED':
    case 'CANVAS-GALLERY':
      return 4; // Canvas pieces
    case 'MIRROR':
      return 1; // Mirrors should use crates
    case 'ACOUSTIC-PANEL':
    case 'ACOUSTIC-PANEL-FRAMED':
      return 4;
    case 'PATIENT-BOARD':
      return 2; // Heavy items
    default:
      return 4; // Default
  }
}

/**
 * Determines boxes per pallet based on box type
 */
export function getBoxesPerPallet(boxType: 'standard' | 'large'): number {
  switch (boxType) {
    case 'standard':
      return 4; // 4 standard boxes per 48"×40" pallet
    case 'large':
      return 3; // 3 large boxes per 48"×40" pallet
    default:
      return 4;
  }
}
