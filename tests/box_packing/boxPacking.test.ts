import { describe, test, expect } from "vitest";
import { Art, ArtType, ArtMaterial } from "../../app/entities/Art";
import { PackagingInteractor } from "../../app/interactors/PackagingInteractor";
import { BoxType } from "../../app/entities/Box";

describe("Box Packing Logic", () => {
  const interactor = new PackagingInteractor();

  describe("Paper Print - Framed with Glass (6 per box rule)", () => {
    test("4 pieces should fit in 1 standard box", () => {
      const art = new Art({
        id: "test-1",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 43, width: 33 },
        quantity: 4,
      });

      const result = interactor.packBoxes([art]);

      expect(result.boxes.length).toBe(1);
      expect(result.boxes[0].getType()).toBe(BoxType.Standard);
      expect(result.boxes[0].getTotalPieces()).toBe(4);
      expect(result.unassignedArt.length).toBe(0);
    });

    test("6 pieces should fit in 1 standard box", () => {
      const art = new Art({
        id: "test-2",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 43, width: 33 },
        quantity: 6,
      });

      const result = interactor.packBoxes([art]);

      expect(result.boxes.length).toBe(1);
      expect(result.boxes[0].getType()).toBe(BoxType.Standard);
      expect(result.boxes[0].getTotalPieces()).toBe(6);
      expect(result.unassignedArt.length).toBe(0);
    });

    test("7 pieces should require 2 standard boxes", () => {
      const art = new Art({
        id: "test-3",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 43, width: 33 },
        quantity: 7,
      });

      const result = interactor.packBoxes([art]);

      expect(result.boxes.length).toBe(2);
      expect(result.boxes[0].getType()).toBe(BoxType.Standard);
      expect(result.boxes[1].getType()).toBe(BoxType.Standard);
      expect(result.boxes[0].getTotalPieces() + result.boxes[1].getTotalPieces()).toBe(7);
      expect(result.unassignedArt.length).toBe(0);
    });

    test("12 pieces should fit in 2 standard boxes", () => {
      const art = new Art({
        id: "test-4",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 43, width: 33 },
        quantity: 12,
      });

      const result = interactor.packBoxes([art]);

      expect(result.boxes.length).toBe(2);
      expect(result.boxes[0].getTotalPieces()).toBe(6);
      expect(result.boxes[1].getTotalPieces()).toBe(6);
      expect(result.unassignedArt.length).toBe(0);
    });
  });

  describe("Canvas - Gallery (4 per box rule)", () => {
    test("4 pieces should fit in 1 standard box", () => {
      const art = new Art({
        id: "test-5",
        productType: ArtType.CanvasFloatFrame,
        material: ArtMaterial.CanvasGallery,
        dimensions: { length: 43, width: 33 },
        quantity: 4,
      });

      const result = interactor.packBoxes([art]);

      expect(result.boxes.length).toBe(1);
      expect(result.boxes[0].getType()).toBe(BoxType.Standard);
      expect(result.boxes[0].getTotalPieces()).toBe(4);
      expect(result.unassignedArt.length).toBe(0);
    });

    test("5 pieces should require 2 standard boxes", () => {
      const art = new Art({
        id: "test-6",
        productType: ArtType.CanvasFloatFrame,
        material: ArtMaterial.CanvasGallery,
        dimensions: { length: 43, width: 33 },
        quantity: 5,
      });

      const result = interactor.packBoxes([art]);

      expect(result.boxes.length).toBe(2);
      expect(result.boxes[0].getTotalPieces() + result.boxes[1].getTotalPieces()).toBe(5);
      expect(result.unassignedArt.length).toBe(0);
    });
  });

  describe("Mixed medium packing", () => {
    test("3 canvas (4 per box) + 2 paper prints (6 per box) should fit in 1 standard box", () => {
      const canvas = new Art({
        id: "canvas-1",
        productType: ArtType.CanvasFloatFrame,
        material: ArtMaterial.CanvasGallery,
        dimensions: { length: 43, width: 33 },
        quantity: 3,
      });

      const paperPrint = new Art({
        id: "paper-1",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 43, width: 33 },
        quantity: 2,
      });

      const result = interactor.packBoxes([canvas, paperPrint]);

      expect(result.boxes.length).toBe(1);
      expect(result.boxes[0].getTotalPieces()).toBe(5);
      expect(result.unassignedArt.length).toBe(0);
    });

    test("4 canvas + 6 paper prints should require 2 boxes (one full of canvas, one full of paper)", () => {
      const canvas = new Art({
        id: "canvas-2",
        productType: ArtType.CanvasFloatFrame,
        material: ArtMaterial.CanvasGallery,
        dimensions: { length: 43, width: 33 },
        quantity: 4,
      });

      const paperPrint = new Art({
        id: "paper-2",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 43, width: 33 },
        quantity: 6,
      });

      const result = interactor.packBoxes([canvas, paperPrint]);

      expect(result.boxes.length).toBe(2);
      expect(result.unassignedArt.length).toBe(0);

      // Total pieces should be 10
      const totalPacked = result.boxes.reduce((sum, box) => sum + box.getTotalPieces(), 0);
      expect(totalPacked).toBe(10);
    });
  });

  describe("Varying sizes - Box type selection", () => {
    test("36x36 should fit in standard box", () => {
      const art = new Art({
        id: "size-1",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 36, width: 36 },
        quantity: 1,
      });

      const result = interactor.packBoxes([art]);

      expect(result.boxes.length).toBe(1);
      expect(result.boxes[0].getType()).toBe(BoxType.Standard);
      expect(result.unassignedArt.length).toBe(0);
    });

    test("43x43 should require large box", () => {
      const art = new Art({
        id: "size-2",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 43, width: 43 },
        quantity: 1,
      });

      const result = interactor.packBoxes([art]);

      expect(result.boxes.length).toBe(1);
      expect(result.boxes[0].getType()).toBe(BoxType.Large);
      expect(result.unassignedArt.length).toBe(0);
    });

    test("44x44 should require custom packaging", () => {
      const art = new Art({
        id: "size-3",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 44, width: 44 },
        quantity: 1,
      });

      const result = interactor.packBoxes([art]);

      // Should be unassigned because it needs custom packaging
      expect(result.boxes.length).toBe(0);
      expect(result.unassignedArt.length).toBe(1);
      expect(result.unassignedReasons[art.getId()]).toContain("custom packaging");
    });

    test("83x35.5 should fit in standard box (telescoping)", () => {
      const art = new Art({
        id: "size-4",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 83, width: 35.5 },
        quantity: 1,
      });

      const result = interactor.packBoxes([art]);

      expect(result.boxes.length).toBe(1);
      expect(result.boxes[0].getType()).toBe(BoxType.Standard);
      expect(result.unassignedArt.length).toBe(0);
    });

    test("85x43 should require custom packaging", () => {
      const art = new Art({
        id: "size-5",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 85, width: 43 },
        quantity: 1,
      });

      const result = interactor.packBoxes([art]);

      // 85" exceeds telescoping max (84"), and 43" exceeds standard box short side (36")
      expect(result.boxes.length).toBe(0);
      expect(result.unassignedArt.length).toBe(1);
    });
  });

  describe("Large box packing with oversized pieces (3 per box rule)", () => {
    test("3 oversized pieces (43x43) should fit in 1 large box", () => {
      const art = new Art({
        id: "large-1",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 43, width: 43 },
        quantity: 3,
      });

      const result = interactor.packBoxes([art]);

      expect(result.boxes.length).toBe(1);
      expect(result.boxes[0].getType()).toBe(BoxType.Large);
      expect(result.boxes[0].getTotalPieces()).toBe(3);
      expect(result.boxes[0].getOversizedPieces()).toBe(3);
      expect(result.unassignedArt.length).toBe(0);
    });

    test("4 oversized pieces should require 2 large boxes", () => {
      const art = new Art({
        id: "large-2",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 43, width: 43 },
        quantity: 4,
      });

      const result = interactor.packBoxes([art]);

      expect(result.boxes.length).toBe(2);
      expect(result.boxes[0].getType()).toBe(BoxType.Large);
      expect(result.boxes[1].getType()).toBe(BoxType.Large);
      expect(result.boxes[0].getTotalPieces() + result.boxes[1].getTotalPieces()).toBe(4);
      expect(result.unassignedArt.length).toBe(0);
    });
  });

  describe("Mixed size packing", () => {
    test("1 large box piece + 2 standard pieces can pack in 1 large box (filling remaining space)", () => {
      const largeArt = new Art({
        id: "mixed-1-large",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 43, width: 43 },
        quantity: 1,
      });

      const standardArt = new Art({
        id: "mixed-1-standard",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 33, width: 43 },
        quantity: 2,
      });

      const result = interactor.packBoxes([largeArt, standardArt]);

      // According to packing rules: "Any remaining space in large boxes can be filled by standard sized art"
      // So all 3 pieces can fit in 1 large box
      expect(result.boxes.length).toBe(1);
      expect(result.boxes[0].getType()).toBe(BoxType.Large);
      expect(result.boxes[0].getTotalPieces()).toBe(3);
      expect(result.unassignedArt.length).toBe(0);
    });

    test("2 large pieces + 1 standard piece require 1 large box (within capacity)", () => {
      const largeArt = new Art({
        id: "mixed-2-large",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 43, width: 43 },
        quantity: 2,
      });

      const standardArt = new Art({
        id: "mixed-2-standard",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 33, width: 43 },
        quantity: 1,
      });

      const result = interactor.packBoxes([largeArt, standardArt]);

      // 2 large (oversized) + 1 standard = 3 pieces in 1 large box
      expect(result.boxes.length).toBe(1);
      expect(result.boxes[0].getType()).toBe(BoxType.Large);
      expect(result.boxes[0].getTotalPieces()).toBe(3);
      expect(result.unassignedArt.length).toBe(0);
    });

    test("6 standard pieces + 6 large pieces should use 2 boxes", () => {
      const standardArt = new Art({
        id: "mixed-3-standard",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 33, width: 43 },
        quantity: 6,
      });

      const largeArt = new Art({
        id: "mixed-3-large",
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 43, width: 43 },
        quantity: 6,
      });

      const result = interactor.packBoxes([standardArt, largeArt]);

      // Standard art fills 1 standard box (6 pieces)
      // Large art requires 2 large boxes (3 per box for oversized)
      expect(result.boxes.length).toBe(3);
      expect(result.unassignedArt.length).toBe(0);

      const standardBoxes = result.boxes.filter(b => b.getType() === BoxType.Standard);
      const largeBoxes = result.boxes.filter(b => b.getType() === BoxType.Large);

      expect(standardBoxes.length).toBe(1);
      expect(largeBoxes.length).toBe(2);
    });
  });
});
