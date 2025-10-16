import { describe, it, expect, beforeEach } from "vitest";
import { Box, BoxType } from "./Box";
import { Art, ArtType, ArtMaterial, SpecialHandlingFlag } from "./Art";
import { PackagingRules } from "../rules/PackagingRules";
import { WeightCalculator } from "../calculations/WeightCalculator";

let artId = 0;

function makeArt(overrides: {
  id?: string;
  productType?: ArtType;
  material?: ArtMaterial;
  dimensions?: { length: number; width: number; height?: number };
  quantity?: number;
  specialHandlingFlags?: SpecialHandlingFlag[];
} = {}): Art {
  return new Art({
    id: overrides.id ?? `art-${artId++}`,
    productType: overrides.productType ?? ArtType.PaperPrint,
    material: overrides.material ?? ArtMaterial.Glass,
    dimensions: overrides.dimensions ?? { length: 30, width: 20, height: 4 },
    quantity: overrides.quantity ?? 1,
    specialHandlingFlags: overrides.specialHandlingFlags,
  });
}

describe("Box", () => {
  let box: Box;

  beforeEach(() => {
    box = new Box({ type: BoxType.Standard });
  });

  describe("canAccommodate", () => {
    it("rejects crate-only art (mirrors)", () => {
      const mirror = makeArt({ productType: ArtType.Mirror });
      expect(box.canAccommodate(mirror)).toBe(false);
    });

    it("rejects art that needs custom packaging (both sides > 43.5\")", () => {
      const oversized = makeArt({ dimensions: { length: 50, width: 45, height: 4 } });
      expect(box.canAccommodate(oversized)).toBe(false);
    });

    it("rejects art that exceeds telescoping limit", () => {
      const tooLong = makeArt({ dimensions: { length: 90, width: 30, height: 4 } });
      expect(box.canAccommodate(tooLong)).toBe(false);
    });

    it("rejects art when quantity exceeds per-product capacity", () => {
      const bulk = makeArt({ quantity: 7 });
      expect(box.canAccommodate(bulk)).toBe(false);
    });

    it("rejects when oversized pieces exceed maxOversizedPieces in a large box", () => {
      const largeBox = new Box({ type: BoxType.Large });
      const oversizeArt = makeArt({ dimensions: { length: 40, width: 38, height: 4 } });

      expect(largeBox.canAccommodate(oversizeArt)).toBe(true);
      largeBox.addArt(oversizeArt); // 1
      largeBox.addArt(makeArt({ dimensions: { length: 39, width: 37, height: 4 } })); // 2
      largeBox.addArt(makeArt({ dimensions: { length: 42, width: 38, height: 4 } })); // 3

      const fourth = makeArt({ dimensions: { length: 41, width: 37, height: 4 } });
      expect(largeBox.canAccommodate(fourth)).toBe(false);
    });

    it("accepts art that fits standard box rules", () => {
      const standard = makeArt({ dimensions: { length: 33, width: 43, height: 4 } });
      expect(box.canAccommodate(standard)).toBe(true);
    });
  });

  describe("addArt", () => {
    it("updates internal state for accepted art", () => {
      const standard = makeArt({ dimensions: { length: 33, width: 43, height: 4 }, quantity: 2 });

      const added = box.addArt(standard);
      expect(added).toBe(true);
      expect(box.getContents()).toHaveLength(1);
      expect(box.getTotalPieces()).toBe(2);
      expect(box.getTotalWeight()).toBe(WeightCalculator.calculateWeight(standard) + box.getSpecification().tareWeight);

      const dims = box.getRequiredDimensions();
      const footprint = PackagingRules.getPlanarFootprint(standard);
      expect(dims.length).toBe(footprint.longSide);
      expect(dims.width).toBe(box.getSpecification().innerWidth);
    });

    it("does not mutate state when art cannot be accommodated", () => {
      const custom = makeArt({ dimensions: { length: 50, width: 50, height: 4 } });
      const beforeContents = box.getContents().length;
      expect(box.addArt(custom)).toBe(false);
      expect(box.getContents()).toHaveLength(beforeContents);
      expect(box.getTotalPieces()).toBe(0);
    });
  });

  describe("capacity helpers", () => {
    it("reports remaining capacity based on max pieces", () => {
      const art = makeArt({ quantity: 6 });
      expect(box.isAtCapacity()).toBe(false);
      expect(box.getRemainingCapacity()).toBe(box.getNominalCapacity());

      box.addArt(art);
      expect(box.isAtCapacity()).toBe(true);
      expect(box.getRemainingCapacity()).toBe(0);
    });

    it("computes telescoping length for standard box", () => {
      const art = makeArt({ dimensions: { length: 70, width: 30, height: 4 } });
      box.addArt(art);
      expect(box.getTelescopingLength()).toBeNull();
      const largeBox = new Box({ type: BoxType.Large });
      largeBox.addArt(makeArt({ dimensions: { length: 40, width: 38, height: 4 } }));
      expect(largeBox.getTelescopingLength()).toBeNull();
    });
  });
});
