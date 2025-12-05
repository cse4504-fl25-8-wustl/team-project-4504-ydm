import { Art } from "../entities/Art";
import { Box, BoxType, getDefaultMaxPiecesPerProduct, PackingMode } from "../entities/Box";
import { PackagingRules } from "../rules/PackagingRules";
import { PackingStrategy, BoxPackingResult, PackingStrategyMetadata } from "./PackingStrategy";

const OVERSIZE_PIECES_PER_BOX = 3;

/**
 * Pack By Strictest Constraint Strategy
 * 
 * Uses the smallest/strictest constraint of all mediums present in the box.
 * If a box has items with different per-box limits, uses the most restrictive one.
 * For example: if mixing paper prints (6/box) with canvas (4/box), limit is 4.
 */
export class BalancedPackingStrategy implements PackingStrategy {
  getMetadata(): PackingStrategyMetadata {
    return {
      id: "balanced",
      name: "Pack by Strictest Constraint",
      description: "Uses the most restrictive packing limit when mixing art types. Ensures all items fit safely within the tightest constraint.",
      bestFor: "Mixed orders where you want to maximize box utilization while respecting all constraints",
      algorithmName: "Pack by Strictest Constraint"
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
      
      // Find box with lightest weight that can accommodate
      let targetBox = this.findBoxWithStrictestConstraint(boxes, art, preferredType);
      
      if (targetBox && targetBox.canAccommodate(art)) {
        targetBox.addArt(art);
        assignments.set(art.getId(), { art, box: targetBox });
      } else {
        const tempBox = new Box({ type: preferredType, packingMode: PackingMode.ByStrictestConstraint });
        
        if (tempBox.canAccommodate(art)) {
          tempBox.addArt(art);
          boxes.push(tempBox);
          assignments.set(art.getId(), { art, box: tempBox });
        } else {
          const maxQuantity = this.determineMaxPiecesPerBox(art, preferredType);
          const splits = this.splitArtByQuantity(art, maxQuantity);
          
          for (const splitArt of splits) {
            let splitBox = this.findBoxWithStrictestConstraint(boxes, splitArt, preferredType);
            
            if (!splitBox) {
              splitBox = new Box({ type: preferredType, packingMode: PackingMode.ByStrictestConstraint });
              if (!splitBox.canAccommodate(splitArt) || !splitBox.addArt(splitArt)) {
                unassignedArt.push(splitArt);
                unassignedReasons[splitArt.getId()] = "Cannot accommodate even after splitting";
                continue;
              }
              boxes.push(splitBox);
            } else {
              if (!splitBox.addArt(splitArt)) {
                splitBox = new Box({ type: preferredType, packingMode: PackingMode.ByStrictestConstraint });
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

  private findBoxWithStrictestConstraint(boxes: Box[], art: Art, preferredType: BoxType): Box | undefined {
    // Find any box that can accommodate, allowing mixed mediums
    // The box's canAccommodate will enforce the strictest constraint
    
    // First try boxes of preferred type
    for (const box of boxes) {
      if (box.getType() === preferredType && box.canAccommodate(art)) {
        return box;
      }
    }

    // For standard-size pieces, allow packing into Large boxes
    if (preferredType === BoxType.Standard) {
      for (const box of boxes) {
        if (box.getType() === BoxType.Large && box.canAccommodate(art)) {
          return box;
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
