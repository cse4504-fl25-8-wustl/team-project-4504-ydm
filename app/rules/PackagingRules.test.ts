import { describe, it, expect, beforeEach } from "vitest";
import { PackagingRules } from "./PackagingRules";
import { Art, ArtType, ArtMaterial, SpecialHandlingFlag } from "../entities/Art";

let artId = 0;

function makeArt(options: {
  productType?: ArtType;
  material?: ArtMaterial;
  dimensions?: { length: number; width: number; height?: number };
  flags?: SpecialHandlingFlag[];
} = {}): Art {
  return new Art({
    id: `rule-art-${artId++}`,
    productType: options.productType ?? ArtType.PaperPrint,
    material: options.material ?? ArtMaterial.Glass,
    dimensions: options.dimensions ?? { length: 30, width: 20, height: 4 },
    specialHandlingFlags: options.flags,
  });
}

describe("PackagingRules", () => {
  describe("requiresSpecialHandling", () => {
    it("returns true when special handling flags are present", () => {
      const flagged = makeArt({ flags: [SpecialHandlingFlag.ManualReview] });
      expect(PackagingRules.requiresSpecialHandling(flagged)).toBe(true);
    });

    it("returns true for predefined product/material combinations", () => {
      const mirror = makeArt({ productType: ArtType.Mirror });
      const wallDecor = makeArt({ productType: ArtType.WallDecor, material: ArtMaterial.Glass });
      expect(PackagingRules.requiresSpecialHandling(mirror)).toBe(true);
      expect(PackagingRules.requiresSpecialHandling(wallDecor)).toBe(true);
    });

    it("returns false when no rules apply", () => {
      const normal = makeArt({ material: ArtMaterial.Acrylic });
      expect(PackagingRules.requiresSpecialHandling(normal)).toBe(false);
    });
  });

  describe("requiresCrateOnly", () => {
    it("currently returns false for supported mediums", () => {
      const mirror = makeArt({ productType: ArtType.Mirror });
      const print = makeArt();
      expect(PackagingRules.requiresCrateOnly(mirror)).toBe(false);
      expect(PackagingRules.requiresCrateOnly(print)).toBe(false);
    });
  });

  describe("requiresOversizeBox / needsCustomPackaging", () => {
    it("identifies oversize box candidates (both sides > 36\" and ≤ 43.5\")", () => {
      const oversize = makeArt({ dimensions: { length: 42, width: 40, height: 4 } });
      expect(PackagingRules.requiresOversizeBox(oversize)).toBe(true);
      expect(PackagingRules.needsCustomPackaging(oversize)).toBe(false);
    });

    it("flags custom packaging when both sides exceed 43.5\"", () => {
      const custom = makeArt({ dimensions: { length: 50, width: 46, height: 4 } });
      expect(PackagingRules.needsCustomPackaging(custom)).toBe(true);
    });
  });

  describe("fitsTelescopingBox", () => {
    it("returns true when short side ≤ 36 and long side ≤ 84", () => {
      const telescoping = makeArt({ dimensions: { length: 70, width: 30, height: 4 } });
      expect(PackagingRules.fitsTelescopingBox(telescoping)).toBe(true);
    });

    it("returns false when short side exceeds 36", () => {
      const tooWide = makeArt({ dimensions: { length: 60, width: 38, height: 4 } });
      expect(PackagingRules.fitsTelescopingBox(tooWide)).toBe(false);
    });
  });

  describe("getPackagingRecommendation", () => {
    it("recommends box workflow for mirrors because they are no longer crate-only", () => {
      const mirror = makeArt({ productType: ArtType.Mirror });
      expect(PackagingRules.getPackagingRecommendation(mirror)).toEqual({
        containerType: "box",
        boxType: "standard",
        specialHandling: true,
      });
    });

    it("recommends custom packaging for very large items", () => {
      const custom = makeArt({ dimensions: { length: 50, width: 50, height: 4 } });
      expect(PackagingRules.getPackagingRecommendation(custom)).toEqual({
        containerType: "custom",
        specialHandling: true,
      });
    });

    it("recommends large box for oversize pieces", () => {
      const oversize = makeArt({ dimensions: { length: 42, width: 40, height: 4 } });
      expect(PackagingRules.getPackagingRecommendation(oversize)).toEqual({
        containerType: "box",
        boxType: "large",
        specialHandling: true,
      });
    });

    it("recommends telescoping standard box when only long side exceeds 36\"", () => {
      const telescoping = makeArt({ dimensions: { length: 70, width: 30, height: 4 } });
      expect(PackagingRules.getPackagingRecommendation(telescoping)).toEqual({
        containerType: "box",
        boxType: "telescoping",
        specialHandling: true,
      });
    });

    it("recommends standard box otherwise", () => {
      const standard = makeArt({ material: ArtMaterial.Acrylic, dimensions: { length: 30, width: 20, height: 4 } });
      expect(PackagingRules.getPackagingRecommendation(standard)).toEqual({
        containerType: "box",
        boxType: "standard",
        specialHandling: false,
      });
    });
  });
});
