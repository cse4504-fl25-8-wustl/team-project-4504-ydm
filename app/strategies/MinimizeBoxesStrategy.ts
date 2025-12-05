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

    // Sort by size descending
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
      
      // Find box with most remaining capacity that can still accommodate
      let targetBox = this.findBoxByDepth(boxes, art, preferredType);
      
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
            let splitBox = this.findBoxByDepth(boxes, splitArt, preferredType);
            
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

    return { boxes, unassignedArt, assignments, unassignedReasons };
  }

  private findBoxByDepth(boxes: Box[], art: Art, preferredType: BoxType): Box | undefined {
    // Check if art will fit based on depth/height constraints
    // The Box class already checks height in fitsDimensions, so we rely on canAccommodate
    
    // First try boxes of preferred type
    for (const box of boxes) {
      if (box.getType() === preferredType && box.canAccommodate(art)) {
        // Additional depth check: ensure the box has physical space
        const boxDims = box.getRequiredDimensions();
        const artDims = art.getRawDimensions();
        
        // Check if adding this art's depth would exceed box height
        if (boxDims.height + artDims.height <= box.getSpecification().innerHeight) {
          return box;
        }
      }
    }

    // For standard-size pieces, check Large boxes
    if (preferredType === BoxType.Standard) {
      for (const box of boxes) {
        if (box.getType() === BoxType.Large && box.canAccommodate(art)) {
          const boxDims = box.getRequiredDimensions();
          const artDims = art.getRawDimensions();
          
          if (boxDims.height + artDims.height <= box.getSpecification().innerHeight) {
            return box;
          }
        }
      }
    }

    // Fallback: any box that can accommodate
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
}
