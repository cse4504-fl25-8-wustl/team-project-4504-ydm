import { describe, it, expect, beforeEach, vi } from "vitest";
import { Crate, CrateType } from "./Crate";
import { Box, BoxType } from "./Box";
import { Art, ArtType, ArtMaterial } from "./Art";

let artId = 0;

function makeArt(dimensions: { length: number; width: number; height?: number }, overrides: { type?: ArtType; material?: ArtMaterial } = {}): Art {
  return new Art({
    id: `crate-art-${artId++}`,
    productType: overrides.type ?? ArtType.PaperPrint,
    material: overrides.material ?? ArtMaterial.Glass,
    dimensions,
  });
}

function makePopulatedBox(type: BoxType, arts: Art[]): Box {
  const box = new Box({ type });
  for (const art of arts) {
    const added = box.addArt(art);
    if (!added) {
      throw new Error("Test setup: art could not be added to box");
    }
  }
  return box;
}

describe("Crate", () => {
  let crate: Crate;

  beforeEach(() => {
    crate = new Crate({ type: CrateType.StandardPallet });
  });

  describe("canAccommodate", () => {
    it("allows standard boxes up to maxBoxes and height limit", () => {
      const boxes = Array.from({ length: 4 }, () =>
        makePopulatedBox(BoxType.Standard, [
          makeArt({ length: 30, width: 20, height: 4 }),
        ]),
      );

      for (const box of boxes) {
        expect(crate.canAccommodate(box)).toBe(true);
        expect(crate.addBox(box)).toBe(true);
      }

      const overflow = makePopulatedBox(BoxType.Standard, [
        makeArt({ length: 30, width: 20, height: 4 }),
      ]);
      expect(crate.canAccommodate(overflow)).toBe(false);
    });

    it("rejects boxes when projected height exceeds 84 inches", () => {
      const tallBox = makePopulatedBox(BoxType.Standard, [
        makeArt({ length: 30, width: 20, height: 4 }),
      ]);
      vi.spyOn(tallBox, "getRequiredDimensions").mockReturnValue({
        length: 36,
        width: 36,
        height: 90,
      });

      expect(crate.canAccommodate(tallBox)).toBe(false);
    });

    it("rejects disallowed box types on restricted pallets", () => {
      const largeBox = makePopulatedBox(BoxType.Large, [
        makeArt({ length: 40, width: 40, height: 4 }),
      ]);

      const glassPallet = new Crate({ type: CrateType.GlassPallet });
      expect(glassPallet.canAccommodate(largeBox)).toBe(false);

      const oversizePallet = new Crate({ type: CrateType.OversizePallet });
      expect(oversizePallet.canAccommodate(largeBox)).toBe(true);
    });
  });

  describe("addBox and weight tracking", () => {
    it("updates total weight and remaining capacity", () => {
      const box = makePopulatedBox(BoxType.Standard, [
        makeArt({ length: 33, width: 43, height: 4 }),
      ]);

      const added = crate.addBox(box);
      expect(added).toBe(true);
      expect(crate.getContents()).toHaveLength(1);
      expect(crate.getRemainingCapacity()).toBe(crate.getSpecification().maxBoxes - 1);
      expect(crate.getTotalWeight()).toBe(crate.getSpecification().tareWeight + box.getTotalWeight());
    });

    it("does not mutate state when box is rejected", () => {
      const glassPallet = new Crate({ type: CrateType.GlassPallet });
      const largeBox = makePopulatedBox(BoxType.Large, [
        makeArt({ length: 40, width: 40, height: 4 }),
      ]);
      const beforeWeight = glassPallet.getTotalWeight();
      expect(glassPallet.addBox(largeBox)).toBe(false);
      expect(glassPallet.getContents()).toHaveLength(0);
      expect(glassPallet.getTotalWeight()).toBe(beforeWeight);
    });
  });

  describe("calculateWeight", () => {
    it("adds overhead and rounds up", () => {
      const box = makePopulatedBox(BoxType.Standard, [
        makeArt({ length: 30, width: 20, height: 4 }),
      ]);
      crate.addBox(box);

      const total = crate.calculateWeight(12.3);
      expect(total).toBe(Math.ceil(crate.getTotalWeight() + 12.3));
    });
  });
});
