import { Art } from "../entities/Art";
import { Box, BoxType, getDefaultMaxPiecesPerProduct, PackingMode } from "../entities/Box";
import { PackagingRules } from "../rules/PackagingRules";
import { PackingStrategy, BoxPackingResult, PackingStrategyMetadata } from "./PackingStrategy";

const OVERSIZE_PIECES_PER_BOX = 3;

/**
 * Pack By Depth Strategy
 * 
 * Uses the depth of the box and the depth of the art to determine if art will fit.
 * Considers the physical stacking depth rather than just piece count.
 * More realistic for actual physical packing.
 */
export class MinimizeBoxesStrategy implements PackingStrategy {
  getMetadata(): PackingStrategyMetadata {
    return {
      id: "minimize-boxes",
      name: "Pack by Depth",
      description: "Considers actual physical depth when stacking items. Checks if items will physically fit based on their thickness.",
      bestFor: "When you need realistic physical packing that accounts for item thickness",
      algorithmName: "Pack by Depth (Physical Fit)"
    };
  }

  packBoxes(artCollection: Art[]): BoxPackingResult {
    const boxes: Box[] = [];
    const unassignedArt: Art[] = [];
    const assignments = new Map<string, { art: Art; box: Box }>();
    const unassignedReasons: Record<string, string> = {};

    const largeBoxArt: Art[] = [];
    const standardBoxArt: Art[] = [];

    for (const art of artCollection) {
      if (PackagingRules.requiresOversizeBox(art)) {
        largeBoxArt.push(art);
      } else {
        standardBoxArt.push(art);
      }
    }

    // PASS 1: Pack large box items first
    const remainingStandardArt = this.packArtItems(largeBoxArt, boxes, assignments, unassignedArt, unassignedReasons);
    
    // PASS 2: Fill partial boxes with standard items, then pack remaining standard items
    this.packArtItems(standardBoxArt, boxes, assignments, unassignedArt, unassignedReasons);

    return { boxes, unassignedArt, assignments, unassignedReasons };
  }

  private packArtItems(
    artItems: Art[],
    boxes: Box[],
    assignments: Map<string, { art: Art; box: Box }>,
    unassignedArt: Art[],
    unassignedReasons: Record<string, string>
  ): void {
    for (const art of artItems) {
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
      
      // First try to find ANY box (any type) that can accommodate this art
      let targetBox = this.findBoxByDepthAnyType(boxes, art);
      
      // If no cross-type box found, try preferred type only
      if (!targetBox) {
        targetBox = this.findBoxByDepth(boxes, art, preferredType);
      }
      
      if (targetBox && targetBox.canAccommodate(art)) {
        targetBox.addArt(art);
        assignments.set(art.getId(), { art, box: targetBox });
      } else {
        const tempBox = new Box({ type: preferredType, packingMode: PackingMode.ByDepth });
        
        if (tempBox.canAccommodate(art)) {
          tempBox.addArt(art);
          boxes.push(tempBox);
          assignments.set(art.getId(), { art, box: tempBox });
        } else {
          const maxQuantity = this.determineMaxPiecesPerBox(art, preferredType);
          const splits = this.splitArtByQuantity(art, maxQuantity);
          
          for (const splitArt of splits) {
            let splitBox = this.findBoxByDepthAnyType(boxes, splitArt);
            if (!splitBox) {
              splitBox = this.findBoxByDepth(boxes, splitArt, preferredType);
            }
            
            if (!splitBox) {
              splitBox = new Box({ type: preferredType, packingMode: PackingMode.ByDepth });
              if (!splitBox.canAccommodate(splitArt) || !splitBox.addArt(splitArt)) {
                unassignedArt.push(splitArt);
                unassignedReasons[splitArt.getId()] = "Cannot accommodate even after splitting";
                continue;
              }
              boxes.push(splitBox);
            } else {
              if (!splitBox.addArt(splitArt)) {
                splitBox = new Box({ type: preferredType, packingMode: PackingMode.ByDepth });
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
  }

  private findBoxByDepthAnyType(boxes: Box[], art: Art): Box | undefined {
    // Find the LAST box of ANY type that can still fit this art
    // This allows cross-type gap-filling (e.g., standard items in large boxes)
    for (let i = boxes.length - 1; i >= 0; i--) {
      const box = boxes[i];
      if (box.canAccommodate(art)) {
        return box;
      }
    }
    return undefined;
  }

  private findBoxByDepth(boxes: Box[], art: Art, preferredType: BoxType): Box | undefined {
    // Find the LAST box of preferred type that can still fit this art
    // This implements sequential gap-filling: fill the most recent partial box first
    let bestBox: Box | undefined;
    
    // Search backwards to find the most recent box that can fit this art
    for (let i = boxes.length - 1; i >= 0; i--) {
      const box = boxes[i];
      if (box.getType() === preferredType && box.canAccommodate(art)) {
        bestBox = box;
        break; // Take the first (most recent) match
      }
    }

    return bestBox;
  }

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
    // Create a temp box of the preferred type to get its capacity for this specific product
    const tempBox = new Box({ type: preferredType });
    
    // Try to get the product-specific limit from the box's rules
    const productType = art.getProductType();
    let productLimit = tempBox.getProductLimit(productType);
    
    if (productLimit !== undefined && Number.isFinite(productLimit)) {
      return productLimit;
    }

    // Fallback to checking if it requires oversize box
    if (PackagingRules.requiresOversizeBox(art)) {
      return OVERSIZE_PIECES_PER_BOX;
    }

    // Last resort: use nominal capacity
    const nominal = tempBox.getNominalCapacity();
    if (Number.isFinite(nominal) && nominal > 0) {
      return nominal;
    }

    return 1;
  }
}
