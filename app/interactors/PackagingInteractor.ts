import { Art, ArtMaterial, ArtType } from "../entities/Art";
import { Box, BoxType, getDefaultMaxPiecesPerProduct } from "../entities/Box";
import { Crate, CrateType, ContainerKind } from "../entities/Crate";
import { DeliveryCapabilities, PackagingRequest } from "../requests/PackagingRequest";
import { PackagingRules } from "../rules/PackagingRules";
import { WeightCalculator } from "../calculations/WeightCalculator";
import {
  PackagingResponse,
  WeightSummary,
  PackingSummary,
  BusinessIntelligenceSummary,
  FreightExportSummary,
  PackagingResponseMetadata,
  BoxRequirementSummary,
  ContainerRequirementSummary,
  PackedContainerDimension,
  OversizedItemFlag,
  WorkOrderSummary,
  OversizedPieceDetail,
} from "../responses/PackagingResponse";

export interface BoxPackingResult {
  boxes: Box[];
  unassignedArt: Art[];
  assignments: Map<string, { art: Art; box: Box }>;
  unassignedReasons: Record<string, string>;
}

export interface ContainerPackingResult {
  containers: Crate[];
  unassignedBoxes: Box[];
}

const MAX_PALLET_HEIGHT_IN = 84;
const OVERSIZE_PIECES_PER_BOX = 3;

export class PackagingInteractor {
  /**
   * Splits an Art object with large quantity into smaller Art objects
   * that can fit within box capacity limits
   */
  private splitArtByQuantity(art: Art, maxQuantity: number): Art[] {
    const effectiveMax = Math.max(1, maxQuantity);
    const totalQuantity = art.getQuantity();
    if (totalQuantity <= effectiveMax) {
      return [art];
    }

    const splits: Art[] = [];
    let remaining = totalQuantity;
    let splitIndex = 0;

    while (remaining > 0) {
      const quantityForThisSplit = Math.min(remaining, effectiveMax);
      
      // Create a new Art object with the split quantity
      const splitArt = new Art({
        id: `${art.getId()}-split-${splitIndex}`,
        productType: art.getProductType(),
        material: art.getMaterial(),
        dimensions: art.getRawDimensions(),
        quantity: quantityForThisSplit,
        specialHandlingFlags: art.getSpecialHandlingFlags(),
        description: art.getDescription(),
        finalMediumLabel: art.getFinalMediumLabel(),
        glazingLabel: art.getGlazingLabel(),
        hardwareLabel: art.getHardwareLabel(),
        hardwarePiecesPerItem: art.getHardwarePiecesPerItem(),
      });

      splits.push(splitArt);
      remaining -= quantityForThisSplit;
      splitIndex++;
    }

    return splits;
  }

  private determineMaxPiecesPerBox(art: Art, preferredType: BoxType): number {
    const typeLimit = getDefaultMaxPiecesPerProduct(art.getProductType());
    if (typeLimit !== undefined) {
      return typeLimit;
    }

    if (PackagingRules.requiresOversizeBox(art)) {
      return OVERSIZE_PIECES_PER_BOX;
    }

    const tempBox = new Box({ type: preferredType });
    const nominal = tempBox.getNominalCapacity();
    if (Number.isFinite(nominal) && nominal > 0) {
      return nominal;
    }

    return 1;
  }

  public packBoxes(artCollection: Art[]): BoxPackingResult {
    const boxes: Box[] = [];
    const unassignedArt: Art[] = [];
    const assignments = new Map<string, { art: Art; box: Box }>();
    const unassignedReasons: Record<string, string> = {};

    // Sort art by size (larger pieces first) to enable better consolidation
    // This allows standard-size pieces to be packed into existing large boxes
    const sortedArt = [...artCollection].sort((a, b) => {
      const aFootprint = PackagingRules.getPlanarFootprint(a);
      const bFootprint = PackagingRules.getPlanarFootprint(b);
      // Sort by long side descending, then short side descending
      if (aFootprint.longSide !== bFootprint.longSide) {
        return bFootprint.longSide - aFootprint.longSide;
      }
      return bFootprint.shortSide - aFootprint.shortSide;
    });

    for (const art of sortedArt) {
      if (PackagingRules.needsCustomPackaging(art)) {
        unassignedArt.push(art);
        unassignedReasons[art.getId()] = "Requires custom packaging (both sides exceed 43.5\")";
        continue;
      }

      if (PackagingRules.requiresCrateOnly(art)) {
        unassignedArt.push(art);
        unassignedReasons[art.getId()] = "Crate-only item; palletization handled later";
        continue;
      }

      const preferredType = PackagingRules.requiresOversizeBox(art) ? BoxType.Large : BoxType.Standard;
      
      // Check if this art needs to be split due to quantity limits
      // Try to add to existing box first
      let targetBox = this.findBoxForArt(boxes, art, preferredType);
      
      if (targetBox && targetBox.canAccommodate(art)) {
        // Can fit in existing box
        targetBox.addArt(art);
        assignments.set(art.getId(), { art, box: targetBox });
      } else {
        // Need to create new box(es) - potentially split if quantity is too large
        const tempBox = new Box({ type: preferredType });
        
        if (tempBox.canAccommodate(art)) {
          // Fits in a single new box
          tempBox.addArt(art);
          boxes.push(tempBox);
          assignments.set(art.getId(), { art, box: tempBox });
        } else {
          // Doesn't fit - need to split the art across multiple boxes
          // This happens when quantity exceeds box capacity

          // Determine split size based on art type and box rules
          // Query the box for the maximum pieces per product type
          const maxQuantity = this.determineMaxPiecesPerBox(art, preferredType);
          const splits = this.splitArtByQuantity(art, maxQuantity);
          
          for (const splitArt of splits) {
            let splitBox = this.findBoxForArt(boxes, splitArt, preferredType);
            
            if (!splitBox) {
              splitBox = new Box({ type: preferredType });
              if (!splitBox.canAccommodate(splitArt) || !splitBox.addArt(splitArt)) {
                unassignedArt.push(splitArt);
                unassignedReasons[splitArt.getId()] = "Cannot accommodate even after splitting";
                continue;
              }
              boxes.push(splitBox);
            } else {
              if (!splitBox.addArt(splitArt)) {
                // Existing box full, create new one
                splitBox = new Box({ type: preferredType });
                if (!splitBox.canAccommodate(splitArt) || !splitBox.addArt(splitArt)) {
                  unassignedArt.push(splitArt);
                  unassignedReasons[splitArt.getId()] = "Cannot accommodate even after splitting";
                  continue;
                }
                boxes.push(splitBox);
              }
            }
            
            assignments.set(splitArt.getId(), { art: splitArt, box: splitBox });
          }
        }
      }
    }

    return {
      boxes,
      unassignedArt,
      assignments,
      unassignedReasons,
    };
  }

  private packArtIntoCrates(artItems: Art[]): { crates: Crate[]; unassignedArt: Art[] } {
    const crates: Crate[] = [];
    const unassignedArt: Art[] = [];

    // Group art by product type and stacking depth for consolidation
    interface ArtWithCapacity {
      art: Art;
      quantity: number;
      stackingDepth: number;
      capacity: number;
    }
    
    const groups = new Map<string, ArtWithCapacity[]>();
    
    // First pass: analyze each art piece and group by product type + stacking depth
    for (const art of artItems) {
      const footprint = PackagingRules.getPlanarFootprint(art);
      const productType = art.getProductType();
      
      // Determine material depth
      const isPaperPrint = productType === ArtType.PaperPrint || productType === ArtType.PaperPrintWithTitlePlate;
      const isCanvas = productType === ArtType.CanvasFloatFrame;
      const materialDepth = isPaperPrint ? 1.83334 : (isCanvas ? 2.5 : 2.0);
      
      // Determine stacking depth
      let stackingDepth: number;
      if (footprint.shortSide <= 36) {
        stackingDepth = 46;
      } else if (footprint.shortSide <= 46) {
        stackingDepth = 36;
      } else {
        unassignedArt.push(art);
        continue;
      }
      
      const capacity = Math.floor(stackingDepth / materialDepth);
      // Group by product type AND stacking depth
      // Pieces with different stacking depths can't share a crate
      const groupKey = `${productType}-${stackingDepth}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      
      groups.get(groupKey)!.push({
        art,
        quantity: art.getQuantity(),
        stackingDepth,
        capacity,
      });
    }
    
    // Second pass: try to consolidate groups with same product type
    // Group by product type only for consolidation check
    const productTypeGroups = new Map<ArtType, ArtWithCapacity[]>();
    for (const [key, items] of groups.entries()) {
      const productType = items[0].art.getProductType();
      if (!productTypeGroups.has(productType)) {
        productTypeGroups.set(productType, []);
      }
      productTypeGroups.get(productType)!.push(...items);
    }
    
    // Pack each product type group
    for (const group of productTypeGroups.values()) {
      if (group.length === 0) continue;
      
      // Calculate total quantity and minimum capacity
      const totalQty = group.reduce((sum, item) => sum + item.quantity, 0);
      const minCapacity = Math.min(...group.map(item => item.capacity));
      
      // If total fits in one crate with min capacity, consolidate
      // Otherwise, pack by stacking depth groups
      if (totalQty <= minCapacity) {
        // Consolidate all into one crate
        const crate = new Crate({ type: CrateType.StandardCrate });
        for (const item of group) {
          const artForCrate = new Art({
            id: `${item.art.getId()}-crate-${crates.length}`,
            productType: item.art.getProductType(),
            material: item.art.getMaterial(),
            dimensions: item.art.getRawDimensions(),
            quantity: item.quantity,
          });
          crate.addArt(artForCrate);
        }
        crates.push(crate);
      } else {
        // Pack by stacking depth groups
        const depthGroups = new Map<number, ArtWithCapacity[]>();
        for (const item of group) {
          if (!depthGroups.has(item.stackingDepth)) {
            depthGroups.set(item.stackingDepth, []);
          }
          depthGroups.get(item.stackingDepth)!.push(item);
        }
        
        for (const depthGroup of depthGroups.values()) {
          const capacity = depthGroup[0].capacity;
          let currentCrate: Crate | null = null;
          let currentCrateSpace = 0;
          
          for (const item of depthGroup) {
            let remainingQty = item.quantity;
            
            while (remainingQty > 0) {
              if (!currentCrate || currentCrateSpace === 0) {
                if (currentCrate) {
                  crates.push(currentCrate);
                }
                currentCrate = new Crate({ type: CrateType.StandardCrate });
                currentCrateSpace = capacity;
              }
              
              const qtyToPack = Math.min(remainingQty, currentCrateSpace);
              
              const artForCrate = new Art({
                id: `${item.art.getId()}-crate-${crates.length}`,
                productType: item.art.getProductType(),
                material: item.art.getMaterial(),
                dimensions: item.art.getRawDimensions(),
                quantity: qtyToPack,
              });
              
              currentCrate.addArt(artForCrate);
              remainingQty -= qtyToPack;
              currentCrateSpace -= qtyToPack;
            }
          }
          
          if (currentCrate) {
            crates.push(currentCrate);
          }
        }
      }
    }
    
    return { crates, unassignedArt };
  }

  public packContainers(boxes: Box[], capabilities: DeliveryCapabilities): ContainerPackingResult {
    const containers: Crate[] = [];
    const unassignedBoxes: Box[] = [];

    // Optimize pallet selection when pallets are accepted
    if (capabilities.acceptsPallets && boxes.length > 0) {
      // Count standard vs large boxes
      const standardBoxes = boxes.filter(b => b.getType() === BoxType.Standard);
      const largeBoxes = boxes.filter(b => b.getType() === BoxType.Large);
      
      // Packing strategy:
      // - Large boxes: 3 per standard pallet, then use oversized pallets if needed
      // - Standard boxes: 4 per standard pallet, 5 per oversized pallet
      // - Mixed pallets (standard + large): max 3 boxes total on standard pallet
      // - Prefer standard pallets for efficiency, use oversized only when needed
      
      // Sort boxes strategically:
      // - For mixed scenarios: pack standard boxes first to reserve space for large boxes
      // - For all-large or all-standard: pack in order (will naturally fill pallets)
      // Strategy: if we have both types, pack standard boxes first so large boxes can fit into mixed pallets
      const sortedBoxes = [...boxes].sort((a, b) => {
        // If we have both types, standard boxes first (so large boxes can join them later)
        if (standardBoxes.length > 0 && largeBoxes.length > 0) {
          if (a.getType() === BoxType.Standard && b.getType() === BoxType.Large) return -1;
          if (a.getType() === BoxType.Large && b.getType() === BoxType.Standard) return 1;
        }
        // Otherwise maintain original order
        return 0;
      });
      
      const packedBoxes = new Set<Box>();
      
      for (const box of sortedBoxes) {
        if (packedBoxes.has(box)) {
          continue;
        }
        
        // Try to find an existing pallet with space
        // Strategy: check all existing containers before creating new ones
        // Priority: standard pallets first (for both box types), then oversized pallets
        let container: Crate | undefined = undefined;
        
        // First pass: try to find standard pallets that can accommodate the box
        // Check ALL existing containers before creating new ones
        for (const crate of containers) {
          if (crate.getType() === CrateType.StandardPallet && crate.canAccommodate(box)) {
            container = crate;
            break; // Found a standard pallet with space, use it
          }
        }
        
        // Second pass: if no standard pallet found, try oversized pallets
        if (!container) {
          for (const crate of containers) {
            if (crate.getType() === CrateType.OversizePallet && crate.canAccommodate(box)) {
              container = crate;
              break; // Found an oversized pallet with space, use it
            }
          }
        }
        
        // Double-check: if we found a container, verify it can still accommodate (defensive check)
        if (container && !container.canAccommodate(box)) {
          container = undefined; // Container can't accommodate, look for another or create new
        }

        if (!container) {
          // Need to create a new pallet
          let newPalletType: CrateType;
          
          if (box.getType() === BoxType.Large) {
            // Large boxes: prefer standard pallets (3 per pallet)
            newPalletType = CrateType.StandardPallet;
          } else {
            // Standard boxes: choose optimal pallet type based on remaining standard boxes
            // But if there are unpacked large boxes, prefer standard pallets to allow mixing
            const unpackedStandardBoxes = standardBoxes.filter(b => !packedBoxes.has(b));
            const unpackedLargeBoxes = largeBoxes.filter(b => !packedBoxes.has(b));
            
            if (unpackedLargeBoxes.length > 0) {
              // Prefer standard pallets to allow mixing with large boxes
              newPalletType = CrateType.StandardPallet;
            } else {
              // Use optimal pallet type based on weight for remaining standard boxes only
              newPalletType = this.selectOptimalPalletType(unpackedStandardBoxes.length);
            }
          }
          
          container = new Crate({ type: newPalletType });
          
          // If new pallet can't accommodate, try alternative pallet type
          if (!container.canAccommodate(box)) {
            if (box.getType() === BoxType.Large && newPalletType === CrateType.StandardPallet) {
              // Try oversized pallet for large box if standard pallet can't accommodate
              container = new Crate({ type: CrateType.OversizePallet });
            } else if (box.getType() === BoxType.Standard && newPalletType === CrateType.StandardPallet) {
              // Try oversized pallet for standard box if standard pallet can't accommodate
              container = new Crate({ type: CrateType.OversizePallet });
            }
          }
          
          // Try to add box to container
          if (!container.canAccommodate(box) || !container.addBox(box)) {
            unassignedBoxes.push(box);
            continue;
          }
          
          // Only add container if it's not already in the array
          if (!containers.includes(container)) {
            containers.push(container);
          }
        } else {
          // Add box to existing container
          // Note: canAccommodate was already checked, so addBox should succeed
          // But if it fails (shouldn't happen), try to find another container or create new one
          if (!container.addBox(box)) {
            // This shouldn't happen if canAccommodate returned true, but handle gracefully
            // Try to find another container or create a new one
            container = undefined;
            
            // Try again with a new container
            if (box.getType() === BoxType.Large) {
              container = new Crate({ type: CrateType.StandardPallet });
            } else {
              const unpackedStandardBoxes = standardBoxes.filter(b => !packedBoxes.has(b));
              const unpackedLargeBoxes = largeBoxes.filter(b => !packedBoxes.has(b));
              
              if (unpackedLargeBoxes.length > 0) {
                container = new Crate({ type: CrateType.StandardPallet });
              } else {
                container = new Crate({ type: this.selectOptimalPalletType(unpackedStandardBoxes.length) });
              }
            }
            
            if (container.canAccommodate(box) && container.addBox(box)) {
              if (!containers.includes(container)) {
                containers.push(container);
              }
            } else {
              unassignedBoxes.push(box);
              continue;
            }
          }
        }
        
        packedBoxes.add(box);
      }
      
      // Handle any remaining unassigned boxes (fallback to oversized pallets)
      for (const box of unassignedBoxes) {
        let container = containers.find((crate) => 
          crate.getType() === CrateType.OversizePallet && crate.canAccommodate(box)
        );

        if (!container) {
          container = new Crate({ type: CrateType.OversizePallet });
          if (!container.canAccommodate(box) || !container.addBox(box)) {
            continue;
          }
          containers.push(container);
        } else if (!container.addBox(box)) {
          // Still can't fit, leave unassigned
        }
      }
    } else {
      // Original logic for crates or when pallets not accepted
      for (const box of boxes) {
        const targetContainerType = this.selectContainerType(box, capabilities);

        if (!targetContainerType) {
          unassignedBoxes.push(box);
          continue;
        }

        let container = containers.find((crate) => crate.getType() === targetContainerType && crate.canAccommodate(box));

        if (!container) {
          container = new Crate({ type: targetContainerType });
          if (!container.canAccommodate(box) || !container.addBox(box)) {
            unassignedBoxes.push(box);
            continue;
          }
          containers.push(container);
        } else if (!container.addBox(box)) {
          unassignedBoxes.push(box);
        }
      }
    }

    return {
      containers,
      unassignedBoxes,
    };
  }

  public packageEverything(request: PackagingRequest): PackagingResponse {
    const processingStart = Date.now();

    // If client accepts crates, pack directly into crates instead of boxes
    let boxResult: BoxPackingResult;
    let crateResult: { crates: Crate[]; unassignedArt: Art[] } = { crates: [], unassignedArt: [] };
    
    if (request.deliveryCapabilities.acceptsCrates) {
      // Pack directly into crates, skip boxing
      crateResult = this.packArtIntoCrates(request.artItems);
      // Create empty box result
      boxResult = {
        boxes: [],
        unassignedArt: crateResult.unassignedArt,
        assignments: new Map(),
        unassignedReasons: {},
      };
    } else {
      // Normal boxing workflow
      boxResult = this.packBoxes(request.artItems);
    }
    
    const containerResult = this.packContainers(boxResult.boxes, request.deliveryCapabilities);
    
    // Merge crates from direct art packing with crates from box packing
    containerResult.containers.push(...crateResult.crates);

    const workOrderSummary = this.buildWorkOrderSummary(request.artItems);
    const weightSummary = this.buildWeightSummary(request.artItems, containerResult);
    const packingSummary = this.buildPackingSummary(boxResult, containerResult);
    const businessIntelligence = this.buildBusinessIntelligence(request, boxResult);
    const freightExport = this.buildFreightExport(request, containerResult, weightSummary.finalShipmentWeightLbs);

    const metadata: PackagingResponseMetadata = {
      warnings: this.buildWarnings(boxResult.boxes),
      errors: this.buildErrorMessages(boxResult, containerResult),
      algorithmUsed: "box-first-fit/pallet-first-fit",
      processingTimeMs: Date.now() - processingStart,
      timestamp: new Date().toISOString(),
    };

    return {
      workOrderSummary,
      weightSummary,
      packingSummary,
      businessIntelligence,
      freightExport,
      metadata,
    };
  }

  private findBoxForArt(boxes: Box[], art: Art, preferredType: BoxType): Box | undefined {
    // First, try to find a box of the preferred type
    for (const box of boxes) {
      if (box.getType() === preferredType && box.canAccommodate(art)) {
        return box;
      }
    }

    // For standard-size pieces, check if there's a Large box with the same product type
    // This allows consolidation of mixed sizes in larger boxes
    if (preferredType === BoxType.Standard) {
      const productType = art.getProductType();
      for (const box of boxes) {
        if (box.getType() === BoxType.Large && 
            box.getCurrentProductType() === productType && 
            box.canAccommodate(art)) {
          return box;
        }
      }
    }

    // Fallback: try any box that can accommodate
    for (const box of boxes) {
      if (box.canAccommodate(art)) {
        return box;
      }
    }

    return undefined;
  }

  /**
   * Selects the optimal pallet type for a given number of standard boxes
   * Compares standard pallets (4 boxes, 60 lbs) vs oversize pallets (5 boxes, 75 lbs)
   * and chooses the option with lower total weight
   * If weights are equal, prefers the option with fewer pallets
   */
  private selectOptimalPalletType(boxCount: number): CrateType {
    // Calculate pallets needed for each option
    const standardPalletsNeeded = Math.ceil(boxCount / 4);
    const oversizePalletsNeeded = Math.ceil(boxCount / 5);
    
    // Calculate total weight for each option
    const standardPalletWeight = standardPalletsNeeded * 60;
    const oversizePalletWeight = oversizePalletsNeeded * 75;
    
    // Choose the option with lower total weight
    if (oversizePalletWeight < standardPalletWeight) {
      return CrateType.OversizePallet;
    }
    if (standardPalletWeight < oversizePalletWeight) {
      return CrateType.StandardPallet;
    }
    
    // If weights are equal, prefer fewer pallets (oversize if it uses fewer)
    if (oversizePalletsNeeded < standardPalletsNeeded) {
      return CrateType.OversizePallet;
    }
    
    // Default to standard (more common)
    return CrateType.StandardPallet;
  }

  private selectContainerType(box: Box, capabilities: DeliveryCapabilities): CrateType | null {
    const prefersPallets = capabilities.acceptsPallets;
    const prefersCrates = capabilities.acceptsCrates;

    const boxType = box.getType();
    if (prefersPallets) {
      if (boxType === BoxType.Large) {
        return CrateType.OversizePallet;
      }
      return CrateType.StandardPallet;
    }

    if (prefersCrates) {
      return CrateType.StandardCrate;
    }

    return null;
  }

  private buildWorkOrderSummary(artItems: Art[]): WorkOrderSummary {
    // Calculate total pieces
    const totalPieces = artItems.reduce((sum, art) => sum + art.getQuantity(), 0);
    
    // Separate standard and oversized pieces
    let standardSizePieces = 0;
    let oversizedPieces = 0;
    const oversizedMap = new Map<string, { quantity: number; weightLbs: number }>();
    
    for (const art of artItems) {
      const quantity = art.getQuantity();
      const isOversized = PackagingRules.isOversized(art);
      
      if (isOversized) {
        oversizedPieces += quantity;
        
        // Group by dimensions
        const dims = art.getDimensions();
        const longSide = Math.max(dims.length, dims.width);
        const shortSide = Math.min(dims.length, dims.width);
        const dimKey = `${longSide}" x ${shortSide}"`;
        
        const existing = oversizedMap.get(dimKey);
        const weight = WeightCalculator.calculateWeight(art);
        
        if (existing) {
          oversizedMap.set(dimKey, {
            quantity: existing.quantity + quantity,
            weightLbs: existing.weightLbs + weight
          });
        } else {
          oversizedMap.set(dimKey, { quantity, weightLbs: weight });
        }
      } else {
        standardSizePieces += quantity;
      }
    }
    
    // Build oversized details array
    const oversizedDetails: OversizedPieceDetail[] = Array.from(oversizedMap.entries()).map(
      ([dimensions, data]) => ({
        dimensions,
        quantity: data.quantity,
        weightLbs: data.weightLbs
      })
    );
    
    return {
      totalPieces,
      standardSizePieces,
      oversizedPieces,
      oversizedDetails
    };
  }

  private buildWeightSummary(artItems: Art[], containerResult: ContainerPackingResult): WeightSummary {
    const totalArtworkWeight = artItems.reduce((sum, art) => sum + WeightCalculator.calculateWeight(art), 0);
    const glassWeight = artItems
      .filter((art) => art.getMaterial() === ArtMaterial.Glass)
      .reduce((sum, art) => sum + WeightCalculator.calculateWeight(art), 0);
    const oversizedWeight = artItems
      .filter((art) => PackagingRules.isOversized(art))
      .reduce((sum, art) => sum + WeightCalculator.calculateWeight(art), 0);

    const pallets = containerResult.containers.filter((container) => container.getContainerKind() === ContainerKind.Pallet);
    const crates = containerResult.containers.filter((container) => container.getContainerKind() === ContainerKind.Crate);

    const palletWeight = pallets.reduce((sum, pallet) => sum + pallet.getTareWeight(), 0);
    const crateWeight = crates.reduce((sum, crate) => sum + crate.getTareWeight(), 0);

    const packagingWeight = palletWeight + crateWeight;

    return {
      totalArtworkWeightLbs: totalArtworkWeight,
      glassFramedWeightLbs: glassWeight,
      oversizedWeightLbs: oversizedWeight,
      packagingWeightLbs: {
        total: packagingWeight,
        pallets: {
          count: pallets.length,
          totalWeight: palletWeight,
        },
        crates: {
          count: crates.length,
          totalWeight: crateWeight,
        },
      },
      finalShipmentWeightLbs: totalArtworkWeight + packagingWeight,
    };
  }

  private buildPackingSummary(
    boxResult: BoxPackingResult,
    containerResult: ContainerPackingResult,
  ): PackingSummary {
    const boxRequirements: BoxRequirementSummary[] = this.summarizeBoxes(boxResult.boxes);
    const containerRequirements: ContainerRequirementSummary[] = this.summarizeContainers(containerResult.containers);
    const packedContainerDimensions: PackedContainerDimension[] = this.buildContainerDimensions(containerResult.containers);
    const hardware = this.summarizeHardware(boxResult);

    return {
      boxRequirements,
      containerRequirements,
      packedContainerDimensions,
      hardware,
    };
  }

  private summarizeBoxes(boxes: Box[]): BoxRequirementSummary[] {
    const groups = new Map<BoxType, BoxRequirementSummary>();

    for (const box of boxes) {
      const type = box.getType();
      if (!groups.has(type)) {
        const spec = box.getSpecification();
        groups.set(type, {
          label: this.describeBoxType(type),
          dimensions: `${spec.innerLength}\"x${spec.innerWidth}\"x${spec.innerHeight}\"`,
          count: 0,
        });
      }
      const entry = groups.get(type)!;
      entry.count += 1;
    }

    return Array.from(groups.values());
  }

  private summarizeContainers(containers: Crate[]): ContainerRequirementSummary[] {
    const groups = new Map<CrateType, ContainerRequirementSummary>();

    for (const container of containers) {
      const type = container.getType();
      if (!groups.has(type)) {
        const spec = container.getSpecification();
        const dimensions = this.describeContainerDimensions(spec.type);
        groups.set(type, {
          label: this.describeContainerType(spec.type),
          dimensions,
          count: 0,
        });
      }

      const entry = groups.get(type)!;
      entry.count += 1;
    }

    return Array.from(groups.values());
  }

  private buildContainerDimensions(containers: Crate[]): PackedContainerDimension[] {
    return containers.map((container, index) => {
      const boxes = container.getContents();
      const footprint = this.calculateCrateFootprint(boxes);
      return {
        containerId: `${this.describeContainerType(container.getType())} ${index + 1}`,
        dimensions: `${footprint.length}\"x${footprint.width}\"x${Math.min(footprint.height, MAX_PALLET_HEIGHT_IN)}\"`,
        weightLbs: container.getTotalWeight(),
      };
    });
  }

  private summarizeHardware(boxResult: BoxPackingResult) {
    const hardwareLineItems = new Map<string, { totalPieces: number; artQuantity: number }>();

    const aggregate = (art: Art) => {
      const label = art.getHardwareLabel();
      if (!label) {
        return;
      }

      const pieces = art.getHardwarePiecesTotal();
      if (!hardwareLineItems.has(label)) {
        hardwareLineItems.set(label, { totalPieces: 0, artQuantity: 0 });
      }

      const entry = hardwareLineItems.get(label)!;
      entry.totalPieces += pieces;
      entry.artQuantity += 1;
    };

    boxResult.assignments.forEach(({ art }) => {
      aggregate(art);
    });

    for (const art of boxResult.unassignedArt) {
      aggregate(art);
    }

    const lineItemSummary = Array.from(hardwareLineItems.entries()).map(([hardwareLabel, details]) => ({
      hardwareLabel,
      totalPieces: details.totalPieces,
      artQuantity: details.artQuantity,
    }));

    const totalsByHardwareType: Record<string, number> = {};
    let totalPieces = 0;

    for (const entry of lineItemSummary) {
      totalsByHardwareType[entry.hardwareLabel] = entry.totalPieces;
      totalPieces += entry.totalPieces;
    }

    return {
      lineItemSummary,
      totalsByHardwareType,
      totalPieces,
    };
  }

  private buildBusinessIntelligence(
    request: PackagingRequest,
    boxResult: BoxPackingResult,
  ): BusinessIntelligenceSummary {
    const oversizeFlags = this.buildOversizeFlags(boxResult.boxes, boxResult.unassignedArt);
    const mediumsToFlag = this.identifyMediumsToFlag(boxResult);

    return {
      clientRulesApplied: ["Standard packing (no client restrictions)"],
      oversizedItems: oversizeFlags,
      mediumsToFlag,
      alternativeRecommendations: [
        "Current method: pallets only",
        "Alternative: mix pallets + crates if destination accepts crates",
      ],
      riskFlags: this.buildRiskFlags(boxResult),
    };
  }

  private buildOversizeFlags(boxes: Box[], unassignedArt: Art[]): OversizedItemFlag[] {
    const oversizeMap = new Map<string, { quantity: number; recommendation: string }>();

    // Check large boxes
    for (const box of boxes) {
      if (box.getType() !== BoxType.Large) {
        continue;
      }

      const dims = box.getRequiredDimensions();
      const key = `${dims.length}\"x${dims.width}\"`;
      if (!oversizeMap.has(key)) {
        oversizeMap.set(key, { quantity: 0, recommendation: "Requires large box" });
      }
      oversizeMap.get(key)!.quantity += box.getContents().length;
    }

    // Check unassigned art for custom packaging needs
    for (const art of unassignedArt) {
      if (PackagingRules.needsCustomPackaging(art)) {
        const footprint = PackagingRules.getPlanarFootprint(art);
        const key = `${Math.round(footprint.longSide)}\"x${Math.round(footprint.shortSide)}\"`;
        if (!oversizeMap.has(key)) {
          oversizeMap.set(key, { quantity: 0, recommendation: "Requires custom packaging" });
        }
        oversizeMap.get(key)!.quantity += art.getQuantity();
      }
    }

    return Array.from(oversizeMap.entries()).map(([dimensions, data]) => ({
      dimensions,
      quantity: data.quantity,
      recommendation: data.recommendation,
    }));
  }

  private identifyMediumsToFlag(boxResult: BoxPackingResult): string[] {
    const flagged = new Set<string>();

    for (const box of boxResult.boxes) {
      for (const art of box.getContents()) {
        if (art.getProductType() === ArtType.WallDecor) {
          flagged.add("Wall Decor – include item URL for documentation");
        }

        if (art.getProductType() === ArtType.MetalPrint) {
          flagged.add("Metal Prints – verify protective wrapping");
        }
      }
    }

    return Array.from(flagged);
  }

  private buildRiskFlags(boxResult: BoxPackingResult): string[] {
    const hasGlass = boxResult.boxes.some((box) =>
      box.getContents().some((art) => art.getMaterial() === ArtMaterial.Glass),
    );
    const hasMirrors = boxResult.boxes.some((box) =>
      box.getContents().some((art) => art.getProductType() === ArtType.Mirror),
    );

    const flags: string[] = [];
    if (!hasGlass && !hasMirrors) {
      flags.push("No high-risk items detected");
    } else {
      if (hasGlass) {
        flags.push("Handle glass-framed pieces with caution");
      }
      if (hasMirrors) {
        flags.push("Mirror items require crate review");
      }
    }

    return flags;
  }

  private buildFreightExport(
    request: PackagingRequest,
    containerResult: ContainerPackingResult,
    finalShipmentWeight: number,
  ): FreightExportSummary {
    const containerLines = containerResult.containers.map((container) => {
      const footprint = this.calculateCrateFootprint(container.getContents());
      return `${footprint.length}\"x${footprint.width}\"x${Math.min(footprint.height, MAX_PALLET_HEIGHT_IN)}\" @ ${container.getTotalWeight()} lbs`;
    });

    return {
      subject: `Quote Request - ${request.clientName} - ${request.jobSiteLocation}`,
      shipmentDetails: [
        `Total Weight: ${finalShipmentWeight} lbs`,
        `Pieces: ${containerResult.containers.length} pallets`,
        `Dimensions: ${containerLines.join(", ")}`,
        `Pickup: ARCH Design, St. Louis, MO`,
        `Delivery: ${request.jobSiteLocation}`,
        `Special Requirements: ${this.describeDeliveryCapabilities(request.deliveryCapabilities)}`,
      ],
    };
  }

  private buildWarnings(boxes: Box[]): string[] {
    const warnings: string[] = [];

    boxes.forEach((box, index) => {
      const telescopingLength = box.getTelescopingLength();
      if (telescopingLength !== null) {
        warnings.push(`Box ${index + 1} telescoped to ${telescopingLength}\" (max ${MAX_PALLET_HEIGHT_IN}\")`);
      }
    });

    return warnings;
  }

  private buildErrorMessages(boxResult: BoxPackingResult, containerResult: ContainerPackingResult): string[] {
    const errors: string[] = [];

    if (boxResult.unassignedArt.length > 0) {
      errors.push(`${boxResult.unassignedArt.length} item(s) require custom handling or crates.`);
    }

    if (containerResult.unassignedBoxes.length > 0) {
      errors.push(`${containerResult.unassignedBoxes.length} box(es) could not be assigned to pallets.`);
    }

    return errors;
  }

  private calculateCrateFootprint(boxes: Box[]): { length: number; width: number; height: number } {
    if (boxes.length === 0) {
      return { length: 0, width: 0, height: 0 };
    }

    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0;

    for (const box of boxes) {
      const dims = box.getRequiredDimensions();
      maxLength = Math.max(maxLength, dims.length);
      maxWidth = Math.max(maxWidth, dims.width);
      totalHeight += dims.height;
    }

    return { length: maxLength, width: maxWidth, height: totalHeight };
  }

  private describeBoxType(type: BoxType): string {
    switch (type) {
      case BoxType.Standard:
        return "Standard box";
      case BoxType.Large:
        return "Large box";
      case BoxType.UpsSmall:
        return "UPS small carton";
      case BoxType.UpsLarge:
        return "UPS large carton";
      default:
        return "Box";
    }
  }

  private describeContainerType(type: CrateType): string {
    switch (type) {
      case CrateType.StandardPallet:
        return "Standard pallet";
      case CrateType.OversizePallet:
        return "Oversize pallet";
      case CrateType.GlassPallet:
        return "Glass pallet";
      case CrateType.StandardCrate:
        return "Standard crate";
      default:
        return "Container";
    }
  }

  private describeContainerDimensions(type: CrateType): string {
    switch (type) {
      case CrateType.StandardPallet:
        return "48\"x40\"";
      case CrateType.OversizePallet:
        return "60\"x40\"";
      case CrateType.GlassPallet:
        return "43\"x35\"";
      case CrateType.StandardCrate:
        return "Custom";
      default:
        return "Unknown";
    }
  }

  private describeDeliveryCapabilities(capabilities: DeliveryCapabilities): string {
    const flags: string[] = [];
    if (capabilities.hasLoadingDock) {
      flags.push("Loading dock");
    }
    if (capabilities.requiresLiftgate) {
      flags.push("Liftgate");
    }
    if (capabilities.needsInsideDelivery) {
      flags.push("Inside delivery");
    }
    if (flags.length === 0) {
      return "None";
    }
    return flags.join(", ");
  }
}
