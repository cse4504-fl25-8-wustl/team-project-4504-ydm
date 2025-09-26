/**
//<<<<<<< student3-catalog-utilities
 * ID Generation Utilities - Student 3
 * 
 * Provides comprehensive ID generation utilities for tracking items, containers,
 * work orders, and shipments
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type IdType = 
  | 'item'           // Individual artwork items
  | 'box'            // Packed boxes
  | 'pallet'         // Pallets
  | 'crate'          // Crates
  | 'shipment'       // Complete shipments
  | 'workorder'      // Work order numbers
  | 'tracking'       // Freight tracking numbers
  | 'quote';         // Quote reference numbers

export interface IdConfig {
  prefix: string;
  length: number;
  includeTimestamp?: boolean;
  includeChecksum?: boolean;
  separator?: string;
}

export interface GeneratedId {
  id: string;
  type: IdType;
  timestamp: Date;
  prefix: string;
  sequence?: number;
}

// ============================================================================
// ID CONFIGURATION PRESETS
// ============================================================================

const ID_CONFIGS: Record<IdType, IdConfig> = {
  item: {
    prefix: 'ITM',
    length: 8,
    separator: '-'
  },
  box: {
    prefix: 'BOX',
    length: 6,
    separator: '-'
  },
  pallet: {
    prefix: 'PLT',
    length: 6,
    separator: '-'
  },
  crate: {
    prefix: 'CRT',
    length: 6,
    separator: '-'
  },
  shipment: {
    prefix: 'SHP',
    length: 8,
    includeTimestamp: true,
    separator: '-'
  },
  workorder: {
    prefix: 'WO',
    length: 5,
    separator: ''
  },
  tracking: {
    prefix: 'TRK',
    length: 10,
    includeChecksum: true,
    separator: '-'
  },
  quote: {
    prefix: 'QTE',
    length: 8,
    includeTimestamp: true,
    separator: '-'
  }
};

// ============================================================================
// COUNTER MANAGEMENT
// ============================================================================

class IdCounter {
  private counters: Map<string, number> = new Map();
  private readonly maxCounter = 999999;

  getNext(type: IdType): number {
    const current = this.counters.get(type) || 0;
    const next = (current + 1) % this.maxCounter;
    this.counters.set(type, next);
    return next;
  }

  reset(type: IdType): void {
    this.counters.set(type, 0);
  }

  resetAll(): void {
    this.counters.clear();
  }

  getCurrent(type: IdType): number {
    return this.counters.get(type) || 0;
  }
}

// Global counter instance
const globalCounter = new IdCounter();

// ============================================================================
// CORE ID GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate a random alphanumeric string
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Generate a sequential number with padding
 */
function generateSequentialNumber(sequence: number, length: number): string {
  return sequence.toString().padStart(length, '0');
}

/**
 * Generate timestamp-based component
 */
function generateTimestampComponent(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  
  return `${year}${month}${day}${hour}${minute}`;
}

/**
 * Calculate simple checksum for validation
 */
function calculateChecksum(input: string): string {
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += input.charCodeAt(i);
  }
  return (sum % 100).toString().padStart(2, '0');
}

// ============================================================================
// MAIN ID GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID based on type and configuration
 */
export function generateId(type: IdType, customConfig?: Partial<IdConfig>): GeneratedId {
  const config = { ...ID_CONFIGS[type], ...customConfig };
  const timestamp = new Date();
  const sequence = globalCounter.getNext(type);
  
  let idComponents: string[] = [config.prefix];
  
  // Add timestamp if configured
  if (config.includeTimestamp) {
    idComponents.push(generateTimestampComponent());
  }
  
  // Add sequential or random component
  const remainingLength = config.length - (config.includeTimestamp ? 10 : 0);
  if (remainingLength > 0) {
    if (type === 'workorder' || type === 'item') {
      // Use sequential for work orders and items for better tracking
      idComponents.push(generateSequentialNumber(sequence, remainingLength));
    } else {
      // Use random for others to avoid predictability
      idComponents.push(generateRandomString(remainingLength));
    }
  }
  
  // Add checksum if configured
  if (config.includeChecksum) {
    const baseId = idComponents.join(config.separator || '');
    idComponents.push(calculateChecksum(baseId));
  }
  
  const finalId = idComponents.join(config.separator || '');
  
  return {
    id: finalId,
    type,
    timestamp,
    prefix: config.prefix,
    sequence
  };
}

/**
 * Generate multiple IDs of the same type
 */
export function generateBatchIds(type: IdType, count: number): GeneratedId[] {
  const ids: GeneratedId[] = [];
  
  for (let i = 0; i < count; i++) {
    ids.push(generateId(type));
  }
  
  return ids;
}

// ============================================================================
// SPECIALIZED ID GENERATORS
// ============================================================================

/**
 * Generate work order ID (matches ARCH format: WO + 5 digits)
 */
export function generateWorkOrderId(): string {
  return generateId('workorder').id;
}

/**
 * Generate item ID for artwork tracking
 */
export function generateItemId(): string {
  return generateId('item').id;
}

/**
 * Generate box ID for packing tracking
 */
export function generateBoxId(): string {
  return generateId('box').id;
}

/**
 * Generate pallet ID
 */
export function generatePalletId(): string {
  return generateId('pallet').id;
}

/**
 * Generate crate ID
 */
export function generateCrateId(): string {
  return generateId('crate').id;
}

/**
 * Generate shipment ID with timestamp
 */
export function generateShipmentId(): string {
  return generateId('shipment').id;
}

/**
 * Generate tracking number for freight
 */
export function generateTrackingNumber(): string {
  return generateId('tracking').id;
}

/**
 * Generate quote reference number
 */
export function generateQuoteId(): string {
  return generateId('quote').id;
}

// ============================================================================
// ID VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate ID format based on type
 */
export function validateId(id: string, type: IdType): boolean {
  const config = ID_CONFIGS[type];
  const separator = config.separator || '';
  
  // Check if ID starts with correct prefix
  if (!id.startsWith(config.prefix)) {
    return false;
  }
  
  // Split by separator and validate structure
  const parts = separator ? id.split(separator) : [id];
  
  if (parts.length < 2) {
    return false;
  }
  
  // Validate prefix
  if (parts[0] !== config.prefix) {
    return false;
  }
  
  // Validate checksum if present
  if (config.includeChecksum && parts.length >= 3) {
    const baseId = parts.slice(0, -1).join(separator);
    const expectedChecksum = calculateChecksum(baseId);
    const actualChecksum = parts[parts.length - 1];
    
    if (expectedChecksum !== actualChecksum) {
      return false;
    }
  }
  
  return true;
}

/**
 * Parse ID to extract components
 */
export function parseId(id: string, type: IdType): {
  prefix: string;
  sequence?: string;
  timestamp?: string;
  checksum?: string;
  isValid: boolean;
} {
  const config = ID_CONFIGS[type];
  const separator = config.separator || '';
  const parts = separator ? id.split(separator) : [id];
  
  const result = {
    prefix: parts[0] || '',
    sequence: undefined as string | undefined,
    timestamp: undefined as string | undefined,
    checksum: undefined as string | undefined,
    isValid: validateId(id, type)
  };
  
  if (parts.length >= 2) {
    if (config.includeTimestamp) {
      result.timestamp = parts[1];
      if (parts.length >= 3) {
        result.sequence = parts[2];
      }
      if (config.includeChecksum && parts.length >= 4) {
        result.checksum = parts[3];
      }
    } else {
      result.sequence = parts[1];
      if (config.includeChecksum && parts.length >= 3) {
        result.checksum = parts[2];
      }
    }
  }
  
  return result;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Reset counter for a specific ID type
 */
export function resetCounter(type: IdType): void {
  globalCounter.reset(type);
}

/**
 * Reset all counters
 */
export function resetAllCounters(): void {
  globalCounter.resetAll();
}

/**
 * Get current counter value for a type
 */
export function getCurrentCounter(type: IdType): number {
  return globalCounter.getCurrent(type);
}

/**
 * Generate a batch of container IDs for a shipment
 */
export function generateContainerBatch(
  boxCount: number,
  palletCount: number,
  crateCount: number
): {
  boxes: string[];
  pallets: string[];
  crates: string[];
} {
  return {
    boxes: generateBatchIds('box', boxCount).map(id => id.id),
    pallets: generateBatchIds('pallet', palletCount).map(id => id.id),
    crates: generateBatchIds('crate', crateCount).map(id => id.id)
  };
}

/**
 * Generate a complete shipment ID set
 */
export function generateShipmentIdSet(itemCount: number): {
  workOrderId: string;
  shipmentId: string;
  quoteId: string;
  itemIds: string[];
} {
  return {
    workOrderId: generateWorkOrderId(),
    shipmentId: generateShipmentId(),
    quoteId: generateQuoteId(),
    itemIds: generateBatchIds('item', itemCount).map(id => id.id)
  };
}

/**
 * Create a human-readable ID summary
 */
export function formatIdSummary(generatedId: GeneratedId): string {
  const parsed = parseId(generatedId.id, generatedId.type);
  let summary = `${generatedId.type.toUpperCase()} ID: ${generatedId.id}`;
  
  if (parsed.timestamp) {
    summary += ` (Generated: ${generatedId.timestamp.toISOString()})`;
  }
  
  if (generatedId.sequence) {
    summary += ` [Sequence: ${generatedId.sequence}]`;
  }
  
  return summary;
}

// ============================================================================
// EXPORT MAIN ID GENERATOR OBJECT
// ============================================================================

export const IdGenerator = {
  // Core functions
  generateId,
  generateBatchIds,
  
  // Specialized generators
  generateWorkOrderId,
  generateItemId,
  generateBoxId,
  generatePalletId,
  generateCrateId,
  generateShipmentId,
  generateTrackingNumber,
  generateQuoteId,
  
  // Validation
  validateId,
  parseId,
  
  // Utilities
  resetCounter,
  resetAllCounters,
  getCurrentCounter,
  generateContainerBatch,
  generateShipmentIdSet,
  formatIdSummary,
  
  // Configuration access
  getConfig: (type: IdType) => ID_CONFIGS[type]
// =======
//  * Temporary ID generator stub.
//  * Student 3's richer implementation will replace this in the integrated branch.
//  */

// let counters: Record<string, number> = {
//   item: 0,
//   box: 0,
//   crate: 0,
//   pallet: 0,
// };

// function nextId(prefix: keyof typeof counters): string {
//   counters[prefix] += 1;
//   return `${prefix.toUpperCase()}-${counters[prefix].toString().padStart(4, "0")}`;
// }

// export const IdGenerator = {
//   generateItemId(): string {
//     return nextId("item");
//   },
//   generateBoxId(): string {
//     return nextId("box");
//   },
//   generateCrateId(): string {
//     return nextId("crate");
//   },
//   generatePalletId(): string {
//     return nextId("pallet");
//   },
// >>>>>>> feature1
};

export default IdGenerator;
