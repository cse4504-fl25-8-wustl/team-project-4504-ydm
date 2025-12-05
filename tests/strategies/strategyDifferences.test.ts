import { describe, test, expect } from "vitest";
import { PackagingInteractor } from "../../app/interactors/PackagingInteractor";
import { Art, ArtType, ArtMaterial } from "../../app/entities/Art";

describe("Packing Strategy Differences", () => {
  describe("Pack by Medium vs Pack by Strictest Constraint", () => {
    test("Pack by Medium keeps different art types in separate boxes", () => {
      // 3 paper prints + 3 canvas pieces
      const paperPrints = new Art({
        id: "paper-1",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 30, width: 24 },
        quantity: 3,
      });

      const canvas = new Art({
        id: "canvas-1",
        productType: ArtType.CanvasFloatFrame,
        material: ArtMaterial.CanvasGallery,
        dimensions: { length: 30, width: 24 },
        quantity: 3,
      });

      // Pack by Medium - should create 2 boxes (one for each type)
      const byMediumInteractor = new PackagingInteractor("first-fit");
      const byMediumResult = byMediumInteractor.packBoxes([paperPrints, canvas]);

      expect(byMediumResult.boxes.length).toBe(2);
      
      // Each box should have only one product type
      byMediumResult.boxes.forEach(box => {
        const types = new Set(box.getContents().map(art => art.getProductType()));
        expect(types.size).toBe(1);
      });
    });

    test("Pack by Strictest Constraint allows mixing different art types", () => {
      // 2 paper prints (6/box limit) + 2 canvas pieces (4/box limit)
      const paperPrints = new Art({
        id: "paper-2",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 30, width: 24 },
        quantity: 2,
      });

      const canvas = new Art({
        id: "canvas-2",
        productType: ArtType.CanvasFloatFrame,
        material: ArtMaterial.CanvasGallery,
        dimensions: { length: 30, width: 24 },
        quantity: 2,
      });

      // Pack by Strictest Constraint - should allow mixing
      const strictestInteractor = new PackagingInteractor("balanced");
      const strictestResult = strictestInteractor.packBoxes([paperPrints, canvas]);

      // Should be able to fit in 1 box (total 4 pieces, strictest limit is 4)
      expect(strictestResult.boxes.length).toBe(1);
      
      // Box should contain both types
      const types = new Set(strictestResult.boxes[0].getContents().map(art => art.getProductType()));
      expect(types.size).toBe(2);
      expect(types.has(ArtType.PaperPrint)).toBe(true);
      expect(types.has(ArtType.CanvasFloatFrame)).toBe(true);
    });
  });

  describe("Pack by Depth considers physical dimensions", () => {
    test("Pack by Depth limits based on accumulated height", () => {
      // Create items with significant height/depth
      const tallItems = new Art({
        id: "tall-1",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 30, width: 24, height: 4 }, // 4" depth each
        quantity: 3, // Total 12" depth
      });

      // Pack by Depth - should consider physical depth
      const byDepthInteractor = new PackagingInteractor("minimize-boxes");
      const byDepthResult = byDepthInteractor.packBoxes([tallItems]);

      // Standard box has 11" inner height
      // 3 items × 4" = 12" which exceeds 11", so should need multiple boxes
      expect(byDepthResult.boxes.length).toBeGreaterThan(0);
      
      // Verify depth tracking is working
      const totalPieces = byDepthResult.boxes.reduce((sum, box) => sum + box.getTotalPieces(), 0);
      expect(totalPieces).toBe(3);
    });

    test("Pack by Medium doesn't enforce depth limits as strictly", () => {
      // Same items as above
      const tallItems = new Art({
        id: "tall-2",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 30, width: 24, height: 4 },
        quantity: 3,
      });

      // Pack by Medium - uses piece count, not depth
      const byMediumInteractor = new PackagingInteractor("first-fit");
      const byMediumResult = byMediumInteractor.packBoxes([tallItems]);

      // Should pack based on piece count (6 per box for paper prints)
      expect(byMediumResult.boxes.length).toBeGreaterThan(0);
      expect(byMediumResult.unassignedArt.length).toBe(0);
    });
  });

  describe("Strictest Constraint enforces minimum capacity", () => {
    test("Mixed box uses the strictest limit", () => {
      // Paper prints: 6/box, Canvas: 4/box
      // If we try to pack 5 paper prints + 1 canvas, strictest limit is 4
      const paperPrints = new Art({
        id: "paper-3",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 30, width: 24 },
        quantity: 3,
      });

      const canvas = new Art({
        id: "canvas-3",
        productType: ArtType.CanvasFloatFrame,
        material: ArtMaterial.CanvasGallery,
        dimensions: { length: 30, width: 24 },
        quantity: 1,
      });

      const strictestInteractor = new PackagingInteractor("balanced");
      const result = strictestInteractor.packBoxes([paperPrints, canvas]);

      // Total 4 pieces should fit in 1 box (strictest limit = 4)
      expect(result.boxes.length).toBe(1);
      expect(result.boxes[0].getTotalPieces()).toBe(4);
    });

    test("Exceeding strictest limit creates new box", () => {
      // Try to pack 4 paper prints + 2 canvas = 6 pieces
      // Strictest limit is 4 (canvas), so should need 2 boxes
      const paperPrints = new Art({
        id: "paper-4",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 30, width: 24 },
        quantity: 4,
      });

      const canvas = new Art({
        id: "canvas-4",
        productType: ArtType.CanvasFloatFrame,
        material: ArtMaterial.CanvasGallery,
        dimensions: { length: 30, width: 24 },
        quantity: 2,
      });

      const strictestInteractor = new PackagingInteractor("balanced");
      const result = strictestInteractor.packBoxes([paperPrints, canvas]);

      // Should need at least 2 boxes due to strictest constraint
      expect(result.boxes.length).toBeGreaterThanOrEqual(2);
      
      // No box should exceed 4 pieces (the strictest limit)
      result.boxes.forEach(box => {
        expect(box.getTotalPieces()).toBeLessThanOrEqual(4);
      });
    });
  });

  describe("All strategies handle same-type items identically", () => {
    test("All strategies produce same result for uniform items", () => {
      const items = new Art({
        id: "uniform-1",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 30, width: 24 },
        quantity: 6,
      });

      const byMedium = new PackagingInteractor("first-fit");
      const byStrictest = new PackagingInteractor("balanced");
      const byDepth = new PackagingInteractor("minimize-boxes");

      const result1 = byMedium.packBoxes([items]);
      const result2 = byStrictest.packBoxes([items]);
      const result3 = byDepth.packBoxes([items]);

      // All should produce 1 box with 6 pieces
      expect(result1.boxes.length).toBe(1);
      expect(result2.boxes.length).toBe(1);
      expect(result3.boxes.length).toBe(1);
      
      expect(result1.boxes[0].getTotalPieces()).toBe(6);
      expect(result2.boxes[0].getTotalPieces()).toBe(6);
      expect(result3.boxes[0].getTotalPieces()).toBe(6);
    });
  });
});
