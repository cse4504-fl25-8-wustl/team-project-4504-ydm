/**
 * Unit Conversion Utilities - Student 3
 * 
 * Provides comprehensive unit conversion functions for the freight calculator
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type WeightUnit = 'lb' | 'kg' | 'g' | 'oz';
export type LengthUnit = 'in' | 'cm' | 'mm' | 'ft' | 'm';
export type VolumeUnit = 'cuft' | 'cum' | 'cuin' | 'cucm';

export interface ConversionResult {
  value: number;
  fromUnit: string;
  toUnit: string;
  originalValue: number;
}

export interface DimensionSet {
  length: number;
  width: number;
  height: number;
  unit: LengthUnit;
}

export interface WeightSet {
  value: number;
  unit: WeightUnit;
}

// ============================================================================
// CONVERSION CONSTANTS
// ============================================================================

const WEIGHT_TO_POUNDS: Record<WeightUnit, number> = {
  lb: 1,
  kg: 2.20462,
  g: 0.00220462,
  oz: 0.0625
};

const LENGTH_TO_INCHES: Record<LengthUnit, number> = {
  in: 1,
  cm: 0.393701,
  mm: 0.0393701,
  ft: 12,
  m: 39.3701
};

// ============================================================================
// WEIGHT CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert weight from one unit to another
 */
export function convertWeight(
  value: number, 
  fromUnit: WeightUnit, 
  toUnit: WeightUnit
): ConversionResult {
  if (value < 0) {
    throw new Error('Weight cannot be negative');
  }
  
  if (!isFinite(value)) {
    throw new Error('Weight must be a finite number');
  }
  
  // Convert to pounds first, then to target unit
  const pounds = value * WEIGHT_TO_POUNDS[fromUnit];
  const convertedValue = pounds / WEIGHT_TO_POUNDS[toUnit];
  
  return {
    value: Math.round(convertedValue * 1000) / 1000, // Round to 3 decimal places
    fromUnit,
    toUnit,
    originalValue: value
  };
}

/**
 * Convert pounds to kilograms
 */
export function lbToKg(pounds: number): number {
  return convertWeight(pounds, 'lb', 'kg').value;
}

/**
 * Convert kilograms to pounds
 */
export function kgToLb(kilograms: number): number {
  return convertWeight(kilograms, 'kg', 'lb').value;
}

/**
 * Convert pounds to ounces
 */
export function lbToOz(pounds: number): number {
  return convertWeight(pounds, 'lb', 'oz').value;
}

/**
 * Convert ounces to pounds
 */
export function ozToLb(ounces: number): number {
  return convertWeight(ounces, 'oz', 'lb').value;
}

// ============================================================================
// LENGTH CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert length from one unit to another
 */
export function convertLength(
  value: number, 
  fromUnit: LengthUnit, 
  toUnit: LengthUnit
): ConversionResult {
  if (value < 0) {
    throw new Error('Length cannot be negative');
  }
  
  if (!isFinite(value)) {
    throw new Error('Length must be a finite number');
  }
  
  // Convert to inches first, then to target unit
  const inches = value * LENGTH_TO_INCHES[fromUnit];
  const convertedValue = inches / LENGTH_TO_INCHES[toUnit];
  
  return {
    value: Math.round(convertedValue * 1000) / 1000, // Round to 3 decimal places
    fromUnit,
    toUnit,
    originalValue: value
  };
}

/**
 * Convert inches to centimeters
 */
export function inToCm(inches: number): number {
  return convertLength(inches, 'in', 'cm').value;
}

/**
 * Convert centimeters to inches
 */
export function cmToIn(centimeters: number): number {
  return convertLength(centimeters, 'cm', 'in').value;
}

/**
 * Convert inches to millimeters
 */
export function inToMm(inches: number): number {
  return convertLength(inches, 'in', 'mm').value;
}

/**
 * Convert millimeters to inches
 */
export function mmToIn(millimeters: number): number {
  return convertLength(millimeters, 'mm', 'in').value;
}

/**
 * Convert feet to inches
 */
export function ftToIn(feet: number): number {
  return convertLength(feet, 'ft', 'in').value;
}

/**
 * Convert inches to feet
 */
export function inToFt(inches: number): number {
  return convertLength(inches, 'in', 'ft').value;
}

/**
 * Convert meters to inches
 */
export function mToIn(meters: number): number {
  return convertLength(meters, 'm', 'in').value;
}

/**
 * Convert inches to meters
 */
export function inToM(inches: number): number {
  return convertLength(inches, 'in', 'm').value;
}

// ============================================================================
// DIMENSION SET CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert a complete dimension set to different units
 */
export function convertDimensions(
  dimensions: DimensionSet, 
  toUnit: LengthUnit
): DimensionSet {
  return {
    length: convertLength(dimensions.length, dimensions.unit, toUnit).value,
    width: convertLength(dimensions.width, dimensions.unit, toUnit).value,
    height: convertLength(dimensions.height, dimensions.unit, toUnit).value,
    unit: toUnit
  };
}

/**
 * Convert dimensions to inches (standard for ARCH calculations)
 */
export function dimensionsToInches(dimensions: DimensionSet): DimensionSet {
  return convertDimensions(dimensions, 'in');
}

/**
 * Convert dimensions to centimeters
 */
export function dimensionsToCm(dimensions: DimensionSet): DimensionSet {
  return convertDimensions(dimensions, 'cm');
}

// ============================================================================
// VOLUME CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate volume in cubic inches
 */
export function calculateVolumeInches(
  length: number, 
  width: number, 
  height: number
): number {
  if (length <= 0 || width <= 0 || height <= 0) {
    throw new Error('All dimensions must be positive for volume calculation');
  }
  
  return length * width * height;
}

/**
 * Calculate volume from dimension set
 */
export function calculateVolume(dimensions: DimensionSet): number {
  const inchDimensions = dimensionsToInches(dimensions);
  return calculateVolumeInches(
    inchDimensions.length,
    inchDimensions.width,
    inchDimensions.height
  );
}

/**
 * Convert cubic inches to cubic feet
 */
export function cuInToCuFt(cubicInches: number): number {
  return cubicInches / 1728; // 12^3 = 1728
}

/**
 * Convert cubic feet to cubic inches
 */
export function cuFtToCuIn(cubicFeet: number): number {
  return cubicFeet * 1728;
}

/**
 * Convert cubic inches to cubic centimeters
 */
export function cuInToCuCm(cubicInches: number): number {
  return cubicInches * 16.3871; // 1 cubic inch = 16.3871 cubic cm
}

/**
 * Convert cubic centimeters to cubic inches
 */
export function cuCmToCuIn(cubicCentimeters: number): number {
  return cubicCentimeters / 16.3871;
}

// ============================================================================
// VALIDATION AND UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate that a value is a positive number
 */
export function validatePositiveNumber(value: number, fieldName: string): void {
  if (!isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number`);
  }
  
  if (value <= 0) {
    throw new Error(`${fieldName} must be positive`);
  }
}

/**
 * Validate dimension set
 */
export function validateDimensions(dimensions: DimensionSet): void {
  validatePositiveNumber(dimensions.length, 'Length');
  validatePositiveNumber(dimensions.width, 'Width');
  validatePositiveNumber(dimensions.height, 'Height');
  
  if (!LENGTH_TO_INCHES[dimensions.unit]) {
    throw new Error(`Invalid length unit: ${dimensions.unit}`);
  }
}

/**
 * Validate weight set
 */
export function validateWeight(weight: WeightSet): void {
  validatePositiveNumber(weight.value, 'Weight');
  
  if (!WEIGHT_TO_POUNDS[weight.unit]) {
    throw new Error(`Invalid weight unit: ${weight.unit}`);
  }
}

/**
 * Round to specified decimal places
 */
export function roundToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Format weight for display with appropriate precision
 */
export function formatWeight(weight: number, unit: WeightUnit): string {
  const precision = unit === 'lb' ? 1 : (unit === 'kg' ? 2 : 0);
  return `${roundToDecimals(weight, precision)} ${unit}`;
}

/**
 * Format dimensions for display
 */
export function formatDimensions(dimensions: DimensionSet): string {
  const precision = dimensions.unit === 'in' ? 1 : (dimensions.unit === 'cm' ? 0 : 1);
  const l = roundToDecimals(dimensions.length, precision);
  const w = roundToDecimals(dimensions.width, precision);
  const h = roundToDecimals(dimensions.height, precision);
  
  return `${l}"×${w}"×${h}" (${dimensions.unit})`;
}

// ============================================================================
// FREIGHT-SPECIFIC CALCULATIONS
// ============================================================================

/**
 * Calculate dimensional weight for freight (used by carriers)
 * Standard formula: (L × W × H) / 166 for LTL freight
 */
export function calculateDimensionalWeight(
  length: number,
  width: number, 
  height: number,
  unit: LengthUnit = 'in'
): number {
  // Convert to inches if needed
  const inchLength = convertLength(length, unit, 'in').value;
  const inchWidth = convertLength(width, unit, 'in').value;
  const inchHeight = convertLength(height, unit, 'in').value;
  
  // LTL freight dimensional weight formula
  const dimensionalWeight = (inchLength * inchWidth * inchHeight) / 166;
  
  return Math.max(1, Math.ceil(dimensionalWeight)); // Minimum 1 lb, round up
}

/**
 * Calculate freight class based on weight and dimensions
 * Simplified version - real freight class depends on commodity type
 */
export function estimateFreightClass(
  actualWeight: number,
  length: number,
  width: number,
  height: number
): number {
  const dimensionalWeight = calculateDimensionalWeight(length, width, height);
  const density = actualWeight / cuInToCuFt(length * width * height);
  
  // Simplified freight class estimation
  if (density >= 30) return 50;  // High density
  if (density >= 15) return 65;  // Medium-high density
  if (density >= 8) return 85;   // Medium density
  if (density >= 4) return 100;  // Medium-low density
  if (density >= 2) return 125;  // Low density
  return 150; // Very low density
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

export const UnitConverter = {
  // Weight conversions
  convertWeight,
  lbToKg,
  kgToLb,
  lbToOz,
  ozToLb,
  
  // Length conversions
  convertLength,
  inToCm,
  cmToIn,
  inToMm,
  mmToIn,
  ftToIn,
  inToFt,
  mToIn,
  inToM,
  
  // Dimension conversions
  convertDimensions,
  dimensionsToInches,
  dimensionsToCm,
  
  // Volume calculations
  calculateVolumeInches,
  calculateVolume,
  cuInToCuFt,
  cuFtToCuIn,
  cuInToCuCm,
  cuCmToCuIn,
  
  // Validation
  validatePositiveNumber,
  validateDimensions,
  validateWeight,
  
  // Formatting
  roundToDecimals,
  formatWeight,
  formatDimensions,
  
  // Freight calculations
  calculateDimensionalWeight,
  estimateFreightClass
};

export default UnitConverter;
