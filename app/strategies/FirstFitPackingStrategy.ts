import { Art } from "../entities/Art";
import { Box, BoxType, getDefaultMaxPiecesPerProduct, PackingMode } from "../entities/Box";
import { PackagingRules } from "../rules/PackagingRules";
import { PackingStrategy, BoxPackingResult, PackingStrategyMetadata } from "./PackingStrategy";

const OVERSIZE_PIECES_PER_BOX = 3;

/**
 * Pack By Medium Strategy
 * 
 * Does NOT allow mixed mediums in the same box.
 * Each box contains only one type of art medium (Paper Print, Canvas, etc.).
 * This is the strictest separation strategy.
 */
export class FirstFitPackingStrategy implements PackingStrategy {
  getMetadata(): PackingStrategyMetadata {
    return {
      id: "first-fit",
      name: "Pack by Medium",
      description: "Keeps different art types separate. Each box contains only one medium (e.g., only paper prints or only canvas).",
      bestFor: "When you need strict separation of art types for handling or delivery",
      algorithmName: "Pack by Medium (No Mixed Mediums)"
    };
  }

  packBoxes(artCollection: Art[]): BoxPackingResult {
    const boxes: Box[] = [];
    const unassignedArt: Art[] = [];
    const assignments = new Map<string, { art: Art; box: Box }>();
    const unassignedReasons: Record<string, string> = {};

    // Sort art by size (larger pieces first) to enable better consolidation
    const sortedArt = [...artCollection].sort((a, b) => {
      const aFootprint = PackagingRules.getPlanarFootprint(a);
      const bFootprint = PackagingRules.getPlanarFootprint(b);
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
      
      let targetBox = this.findBoxForArt(boxes, art, preferredType);
      
      if (targetBox && targetBox.canAccommodate(art)) {
        targetBox.addArt(art);
        assignments.set(art.getId(), { art, box: targetBox });
      } else {
        const tempBox = new Box({ type: preferredType, packingMode: PackingMode.ByMedium });
        
        if (tempBox.canAccommodate(art)) {
          tempBox.addArt(art);
          boxes.push(tempBox);
          assignments.set(art.getId(), { art, box: tempBox });
        } else {
          const maxQuantity = this.determineMaxPiecesPerBox(art, preferredType);
          const splits = this.splitArtByQuantity(art, maxQuantity);
          
          for (const splitArt of splits) {
            let splitBox = this.findBoxForArt(boxes, splitArt, preferredType);
            
            if (!splitBox) {
              splitBox = new Box({ type: preferredType, packingMode: PackingMode.ByMedium });
              if (!splitBox.canAccommodate(splitArt) || !splitBox.addArt(splitArt)) {
                unassignedArt.push(splitArt);
                unassignedReasons[splitArt.getId()] = "Cannot accommodate even after splitting";
                continue;
              }
              boxes.push(splitBox);
            } else {
              if (!splitBox.addArt(splitArt)) {
                splitBox = new Box({ type: preferredType, packingMode: PackingMode.ByMedium });
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

    return { boxes, unassignedArt, assignments, unassignedReasons };
  }

  private findBoxForArt(boxes: Box[], art: Art, preferredType: BoxType): Box | undefined {
    for (const box of boxes) {
      if (box.getType() === preferredType && box.canAccommodate(art)) {
        return box;
      }
    }

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

    for (const box of boxes) {
      if (box.canAccommodate(art)) {
        return box;
      }
    }

    return undefined;
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
    const productLimit = tempBox.getProductLimit(productType);
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
