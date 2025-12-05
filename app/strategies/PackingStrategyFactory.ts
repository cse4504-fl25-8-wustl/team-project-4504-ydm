import { PackingStrategy, PackingStrategyMetadata } from "./PackingStrategy";
import { FirstFitPackingStrategy } from "./FirstFitPackingStrategy";
import { BalancedPackingStrategy } from "./BalancedPackingStrategy";
import { MinimizeBoxesStrategy } from "./MinimizeBoxesStrategy";

/**
 * Factory for creating and managing packing strategies
 */
export class PackingStrategyFactory {
  private static strategies: Map<string, PackingStrategy> = new Map<string, PackingStrategy>([
    ["first-fit", new FirstFitPackingStrategy()],
    ["balanced", new BalancedPackingStrategy()],
    ["minimize-boxes", new MinimizeBoxesStrategy()],
  ]);

  /**
   * Get a strategy by its ID
   * @param strategyId - The strategy identifier
   * @returns The packing strategy instance
   * @throws Error if strategy not found
   */
  static getStrategy(strategyId: string): PackingStrategy {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Unknown packing strategy: ${strategyId}`);
    }
    return strategy;
  }

  /**
   * Get the default strategy
   */
  static getDefaultStrategy(): PackingStrategy {
    return this.strategies.get("first-fit")!;
  }

  /**
   * Get metadata for all available strategies
   */
  static getAllStrategyMetadata(): PackingStrategyMetadata[] {
    return Array.from(this.strategies.values()).map(strategy => strategy.getMetadata());
  }

  /**
   * Check if a strategy ID is valid
   */
  static isValidStrategyId(strategyId: string): boolean {
    return this.strategies.has(strategyId);
  }
}
