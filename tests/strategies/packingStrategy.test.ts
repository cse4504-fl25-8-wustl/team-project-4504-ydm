import { describe, test, expect } from "vitest";
import { PackingStrategyFactory } from "../../app/strategies/PackingStrategyFactory";
import { PackagingInteractor } from "../../app/interactors/PackagingInteractor";
import { Art, ArtType, ArtMaterial } from "../../app/entities/Art";

describe("Packing Strategy Pattern", () => {
  test("Factory returns all available strategies", () => {
    const strategies = PackingStrategyFactory.getAllStrategyMetadata();
    
    expect(strategies.length).toBe(3);
    expect(strategies.map(s => s.id)).toContain("first-fit");
    expect(strategies.map(s => s.id)).toContain("balanced");
    expect(strategies.map(s => s.id)).toContain("minimize-boxes");
  });

  test("Factory validates strategy IDs", () => {
    expect(PackingStrategyFactory.isValidStrategyId("first-fit")).toBe(true);
    expect(PackingStrategyFactory.isValidStrategyId("balanced")).toBe(true);
    expect(PackingStrategyFactory.isValidStrategyId("minimize-boxes")).toBe(true);
    expect(PackingStrategyFactory.isValidStrategyId("invalid")).toBe(false);
  });

  test("Factory throws error for unknown strategy", () => {
    expect(() => PackingStrategyFactory.getStrategy("unknown")).toThrow("Unknown packing strategy");
  });

  test("PackagingInteractor uses default strategy when none specified", () => {
    const interactor = new PackagingInteractor();
    const metadata = interactor.getPackingStrategyMetadata();
    
    expect(metadata.id).toBe("first-fit");
  });

  test("PackagingInteractor can use specified strategy", () => {
    const interactor = new PackagingInteractor("balanced");
    const metadata = interactor.getPackingStrategyMetadata();
    
    expect(metadata.id).toBe("balanced");
    expect(metadata.name).toBe("Pack by Strictest Constraint");
  });

  test("PackagingInteractor can change strategy at runtime", () => {
    const interactor = new PackagingInteractor("first-fit");
    
    expect(interactor.getPackingStrategyMetadata().id).toBe("first-fit");
    
    interactor.setPackingStrategy("minimize-boxes");
    
    expect(interactor.getPackingStrategyMetadata().id).toBe("minimize-boxes");
  });

  test("All strategies can pack boxes successfully", () => {
    const art = new Art({
      id: "test-1",
      productType: ArtType.PaperPrint,
      material: ArtMaterial.Glass,
      dimensions: { length: 43, width: 33 },
      quantity: 4,
    });

    const strategyIds = ["first-fit", "balanced", "minimize-boxes"];

    for (const strategyId of strategyIds) {
      const interactor = new PackagingInteractor(strategyId);
      const result = interactor.packBoxes([art]);

      expect(result.boxes.length).toBeGreaterThan(0);
      expect(result.unassignedArt.length).toBe(0);
      expect(result.boxes[0].getTotalPieces()).toBe(4);
    }
  });

  test("Strategy metadata contains required fields", () => {
    const strategies = PackingStrategyFactory.getAllStrategyMetadata();

    for (const strategy of strategies) {
      expect(strategy.id).toBeTruthy();
      expect(strategy.name).toBeTruthy();
      expect(strategy.description).toBeTruthy();
      expect(strategy.bestFor).toBeTruthy();
      expect(strategy.algorithmName).toBeTruthy();
    }
  });
});
