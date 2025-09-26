/**
 * Server action for packing orchestration
 * Main entry point for packing calculations
 */

'use server';

import { validatePackInput, determineMaterialType, calculateItemWeight, isOversized, requiresLargeBox } from './domain/validate';
import { calculateCost, calculatePackagingWeight } from './domain/cost';
import { PackInputDTO } from './domain/dto/PackInputDTO';
import { PackOutputDTO, PackedItem, PackedBox, PackedContainer, OversizedItem, SpecialMedium } from './domain/dto/PackOutputDTO';

/**
 * Main packing calculation server action
 */
export async function calculatePacking(input: PackInputDTO): Promise<PackOutputDTO> {
  try {
    // Validate input
    const validatedInput = validatePackInput(input);
    
    // Process items
    const packedItems = processItems(validatedInput.items);
    
    // Calculate weights
    const totalArtworkWeight = packedItems.reduce((sum, item) => sum + item.weight, 0);
    
    // Pack items into boxes
    const packedBoxes = packItemsToBoxes(packedItems);
    
    // Pack boxes into containers
    const packedContainers = packBoxesToContainers(packedBoxes, validatedInput.deliveryCapabilities);
    
    // Calculate packaging weight
    const totalPackagingWeight = calculatePackagingWeight(
      packedContainers.filter(c => c.type === 'standard-pallet').length,
      packedContainers.filter(c => c.type === 'oversize-pallet').length,
      packedContainers.filter(c => c.type === 'crate').length
    );
    
    const finalShipmentWeight = totalArtworkWeight + totalPackagingWeight;
    
    // Generate business intelligence
    const businessIntelligence = generateBusinessIntelligence(
      packedItems,
      validatedInput.clientName,
      validatedInput.deliveryCapabilities
    );
    
    // Create output structure
    const output: PackOutputDTO = {
      workOrder: validatedInput.workOrder,
      clientName: validatedInput.clientName,
      totalPieces: packedItems.reduce((sum, item) => sum + item.quantity, 0),
      
      weightSummary: {
        totalArtworkWeight,
        totalPackagingWeight,
        finalShipmentWeight,
        weightBreakdown: {
          glassFramedPrints: packedItems
            .filter(item => item.materialType.includes('GLASS') || item.materialType.includes('ACRYLIC'))
            .reduce((sum, item) => sum + item.weight, 0),
          oversizedPieces: packedItems
            .filter(item => item.isOversized)
            .reduce((sum, item) => sum + item.weight, 0),
          pallets: totalPackagingWeight,
          crates: 0, // Will be calculated if crates are used
        },
      },
      
      packingSummary: {
        boxRequirements: {
          standardBoxes: packedBoxes.filter(box => box.type === 'standard').length,
          largeBoxes: packedBoxes.filter(box => box.type === 'large').length,
          totalBoxes: packedBoxes.length,
        },
        containerRequirements: {
          standardPallets: packedContainers.filter(c => c.type === 'standard-pallet').length,
          oversizePallets: packedContainers.filter(c => c.type === 'oversize-pallet').length,
          crates: packedContainers.filter(c => c.type === 'crate').length,
        },
        finalDimensions: packedContainers,
        hardwareCalculation: calculateHardware(packedItems),
      },
      
      businessIntelligence,
      
      freightCarrierExport: generateFreightExport(validatedInput, finalShipmentWeight, packedContainers),
      
      cost: {
        estimatedCost: 0, // Will be calculated
        costBreakdown: {
          artworkWeight: totalArtworkWeight,
          packagingWeight: totalPackagingWeight,
          shippingCost: 0,
          handlingCost: 0,
          totalCost: 0,
        },
      },
      
      items: packedItems,
      boxes: packedBoxes,
      containers: packedContainers,
    };
    
    // Calculate costs
    const costBreakdown = calculateCost(output, validatedInput.clientName);
    output.cost.estimatedCost = costBreakdown.totalCost;
    output.cost.costBreakdown = costBreakdown;
    
    return output;
    
  } catch (error) {
    throw new Error(`Packing calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process and validate items
 */
function processItems(items: PackInputDTO['items']): PackedItem[] {
  return items.map(item => {
    const materialType = determineMaterialType(item.finalMedium, item.glazing);
    const weight = calculateItemWeight(item.outsideSizeWidth, item.outsideSizeHeight, materialType, item.quantity);
    const oversized = isOversized(item.outsideSizeWidth, item.outsideSizeHeight);
    const requiresLarge = requiresLargeBox(item.outsideSizeWidth, item.outsideSizeHeight);
    
    return {
      lineNumber: item.lineNumber,
      tagNumber: item.tagNumber,
      quantity: item.quantity,
      finalMedium: item.finalMedium,
      dimensions: {
        width: item.outsideSizeWidth,
        height: item.outsideSizeHeight,
      },
      weight,
      materialType,
      isOversized: oversized,
      requiresLargeBox: requiresLarge,
      glazing: item.glazing,
      hardware: item.hardware,
    };
  });
}

/**
 * Pack items into boxes (simplified algorithm)
 */
function packItemsToBoxes(items: PackedItem[]): PackedBox[] {
  const boxes: PackedBox[] = [];
  let boxId = 1;
  
  // Group items by box requirements
  const standardItems = items.filter(item => !item.requiresLargeBox);
  const largeItems = items.filter(item => item.requiresLargeBox);
  
  // Pack standard items
  let currentBox: PackedItem[] = [];
  let currentWeight = 0;
  const maxBoxWeight = 200; // lbs per box
  
  for (const item of standardItems) {
    if (currentWeight + item.weight > maxBoxWeight && currentBox.length > 0) {
      // Create new box
      boxes.push(createBox(`box-${boxId++}`, 'standard', currentBox));
      currentBox = [item];
      currentWeight = item.weight;
    } else {
      currentBox.push(item);
      currentWeight += item.weight;
    }
  }
  
  if (currentBox.length > 0) {
    boxes.push(createBox(`box-${boxId++}`, 'standard', currentBox));
  }
  
  // Pack large items (each gets its own box for now)
  for (const item of largeItems) {
    boxes.push(createBox(`box-${boxId++}`, 'large', [item]));
  }
  
  return boxes;
}

/**
 * Create a box with items
 */
function createBox(id: string, type: 'standard' | 'large', items: PackedItem[]): PackedBox {
  const dimensions = type === 'standard' 
    ? { length: 37, width: 11, height: 31 }
    : { length: 44, width: 13, height: 48 };
  
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const piecesCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  return {
    id,
    type,
    dimensions,
    items,
    totalWeight,
    piecesCount,
  };
}

/**
 * Pack boxes into containers
 */
function packBoxesToContainers(boxes: PackedBox[], deliveryCapabilities: PackInputDTO['deliveryCapabilities']): PackedContainer[] {
  const containers: PackedContainer[] = [];
  let containerId = 1;
  
  // Group boxes by type
  const standardBoxes = boxes.filter(box => box.type === 'standard');
  const largeBoxes = boxes.filter(box => box.type === 'large');
  
  // Pack standard boxes (4 per pallet)
  for (let i = 0; i < standardBoxes.length; i += 4) {
    const boxGroup = standardBoxes.slice(i, i + 4);
    const totalWeight = boxGroup.reduce((sum, box) => sum + box.totalWeight, 0);
    
    containers.push({
      id: `container-${containerId++}`,
      type: 'standard-pallet',
      dimensions: { length: 48, width: 40, height: 52 },
      weight: 60, // pallet weight
      boxes: boxGroup,
      totalWeight: totalWeight + 60,
    });
  }
  
  // Pack large boxes (3 per pallet, or use oversize pallet)
  for (let i = 0; i < largeBoxes.length; i += 3) {
    const boxGroup = largeBoxes.slice(i, i + 3);
    const totalWeight = boxGroup.reduce((sum, box) => sum + box.totalWeight, 0);
    
    containers.push({
      id: `container-${containerId++}`,
      type: 'oversize-pallet',
      dimensions: { length: 60, width: 40, height: 52 },
      weight: 75, // oversize pallet weight
      boxes: boxGroup,
      totalWeight: totalWeight + 75,
    });
  }
  
  return containers;
}

/**
 * Generate business intelligence
 */
function generateBusinessIntelligence(
  items: PackedItem[],
  clientName: string,
  deliveryCapabilities: PackInputDTO['deliveryCapabilities']
): PackOutputDTO['businessIntelligence'] {
  const oversizedItems: OversizedItem[] = items
    .filter(item => item.isOversized)
    .map(item => ({
      dimensions: `${item.dimensions.width}"×${item.dimensions.height}"`,
      quantity: item.quantity,
      weight: item.weight,
      requiresLargeBox: item.requiresLargeBox,
    }));
  
  const specialMediums: SpecialMedium[] = items
    .filter(item => item.finalMedium.toLowerCase().includes('wall decor') || 
                   item.finalMedium.toLowerCase().includes('commission'))
    .map(item => ({
      finalMedium: item.finalMedium,
      quantity: item.quantity,
      isHighValue: item.finalMedium.toLowerCase().includes('commission'),
    }));
  
  const clientRules: string[] = [];
  if (clientName.toLowerCase().includes('sunrise')) {
    clientRules.push('Standard packing (no client restrictions)');
  }
  
  const recommendations: string[] = [];
  if (deliveryCapabilities.acceptsCrates && items.some(item => item.requiresLargeBox)) {
    recommendations.push('Consider crates for oversized items to reduce damage risk');
  }
  
  const riskFlags: string[] = [];
  if (items.some(item => item.materialType === 'MIRROR' || item.glazing?.includes('Glass'))) {
    riskFlags.push('Glass and mirror items detected - ensure proper protective packaging');
  }
  
  return {
    clientSpecificRulesApplied: clientRules,
    oversizedItemsFlagged: oversizedItems,
    specialFinalMediumsFlagged: specialMediums,
    alternativeRecommendations: recommendations,
    riskFlags,
  };
}

/**
 * Calculate hardware requirements
 */
function calculateHardware(items: PackedItem[]): PackOutputDTO['packingSummary']['hardwareCalculation'] {
  const hardwareMap = new Map<string, number>();
  
  items.forEach((item: PackedItem) => {
    if (item.hardware) {
      const current = hardwareMap.get(item.hardware) || 0;
      hardwareMap.set(item.hardware, current + item.quantity);
    }
  });
  
  const lineItemHardware = Array.from(hardwareMap.entries()).map(([type, quantity]) => ({
    hardwareType: type,
    quantity,
  }));
  
  // Estimate wall hardware (rough calculation)
  const totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);
  const drywallAnchors = Math.ceil(totalPieces * 0.6);
  const screws = drywallAnchors * 2;
  
  return {
    lineItemHardware,
    wallHardwareNeeded: {
      drywallAnchors,
      screws,
      tBolts: 0,
    },
  };
}

/**
 * Generate freight carrier export format
 */
function generateFreightExport(
  input: PackInputDTO,
  totalWeight: number,
  containers: PackedContainer[]
): PackOutputDTO['freightCarrierExport'] {
  const dimensions = containers.map(c => 
    `${c.dimensions.length}"×${c.dimensions.width}"×${c.dimensions.height}" @ ${c.totalWeight} lbs`
  ).join(', ');
  
  const specialRequirements: string[] = [];
  if (input.deliveryCapabilities.liftgateRequired) specialRequirements.push('Liftgate required');
  if (input.deliveryCapabilities.insideDeliveryNeeded) specialRequirements.push('Inside delivery needed');
  if (input.deliveryCapabilities.loadingDockAccess) specialRequirements.push('Loading dock access available');
  
  return {
    subject: `Quote Request - ${input.workOrder} - ${input.clientName}`,
    shipmentDetails: {
      totalWeight,
      pieces: containers.length,
      dimensions,
      pickup: 'ARCH Design, St. Louis, MO',
      delivery: input.jobSiteLocation,
      specialRequirements,
    },
  };
}
