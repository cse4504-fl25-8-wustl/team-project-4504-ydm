import { describe, it, expect, beforeEach, vi } from "vitest";
import { WeightCalculator } from "./WeightCalculator";
import { Art, ArtMaterial, ArtType } from "../entities/Art";

let artId = 0;

function makeArt(options: {
  material?: ArtMaterial;
  dimensions?: { length: number; width: number; height?: number };
  quantity?: number;
} = {}): Art {
  return new Art({
    id: `weight-art-${artId++}`,
    productType: ArtType.PaperPrint,
    material: options.material ?? ArtMaterial.Glass,
    dimensions: options.dimensions ?? { length: 30, width: 20, height: 4 },
    quantity: options.quantity ?? 1,
  });
}

describe("WeightCalculator", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calculates weight using surface area, material factor, and quantity (rounded up)", () => {
    const art = makeArt({ dimensions: { length: 33, width: 43, height: 4 }, quantity: 2 });
    const weight = WeightCalculator.calculateWeight(art);

    // 33 * 43 = 1419 sq in -> *0.0098 = 13.9062 -> *2 = 27.8124 -> ceil = 28
    expect(weight).toBe(28);
  });

  it("warns and returns 0 for unknown material", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const art = makeArt({ material: ArtMaterial.Unknown });

    expect(WeightCalculator.calculateWeight(art)).toBe(0);
    expect(warn).toHaveBeenCalled();
  });

  it("throws when requesting weight factor for unsupported material", () => {
    // Cast to bypass exhaustive enum check
    expect(() => WeightCalculator.getWeightFactor(999 as unknown as ArtMaterial)).toThrow();
  });

  it("sums weights across multiple pieces", () => {
    const a = makeArt({ dimensions: { length: 20, width: 20, height: 4 } });
    const b = makeArt({ dimensions: { length: 40, width: 30, height: 4 } });

    const total = WeightCalculator.calculateTotalWeight([a, b]);
    expect(total).toBe(WeightCalculator.calculateWeight(a) + WeightCalculator.calculateWeight(b));
  });
});
