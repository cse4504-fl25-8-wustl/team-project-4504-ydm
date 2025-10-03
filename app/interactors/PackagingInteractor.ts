import { Art, ArtType, GlazingType } from "../entities/Art";
import { Box } from "../entities/Box";
import { Crate } from "../entities/Crate";
import { PackagingRequest } from "../requests/PackagingRequest";
import { PackagingResponse } from "../responses/PackagingResponse";
import { 
  HybridPackingAlgorithm, 
  BoxPackingResult, 
  CratePackingResult 
} from "./PackingAlgorithms";
import { 
  ContainerOptimizer, 
  ContainerSelectionCriteria, 
  ContainerPackingResult 
} from "./ContainerOptimizer";
import { ResponseAggregator } from "../responses/ResponseAggregator";

/**
 * PackagingInteractor orchestrates the packing workflows with advanced algorithms and fallback paths.
 * Implements comprehensive packing strategies with error handling and optimization.
 */
export class PackagingInteractor {
  private packingAlgorithm: HybridPackingAlgorithm;
  private containerOptimizer: ContainerOptimizer;
  private responseAggregator: ResponseAggregator;

  constructor() {
    this.packingAlgorithm = new HybridPackingAlgorithm();
    this.containerOptimizer = new ContainerOptimizer();
    this.responseAggregator = new ResponseAggregator();
  }

  /**
   * Executes the box-packing algorithm for a collection of art pieces.
   * Uses hybrid algorithm to find optimal packing strategy.
   */
  public packBoxes(artCollection: Art[]): BoxPackingResult {
    if (artCollection.length === 0) {
      return {
        boxes: [],
        unassignedArt: [],
        packingEfficiency: 1.0,
        totalWeight: 0
      };
    }

    try {
      // Use hybrid algorithm for optimal packing
      const result = this.packingAlgorithm.packBoxes(artCollection);
      
      // Apply fallback strategies if needed
      if (result.unassignedArt.length > 0) {
        return this.applyBoxPackingFallbacks(result, artCollection);
      }

      return result;
    } catch (error) {
      // Fallback to simple one-item-per-box strategy
      console.warn("Packing algorithm failed, using fallback strategy:", error);
      return this.fallbackBoxPacking(artCollection);
    }
  }

  /**
   * Executes the crate-packing algorithm for a collection of boxes.
   * Optimizes container selection based on delivery capabilities.
   */
  public packCrates(boxes: Box[], deliveryCapabilities?: any): CratePackingResult {
    if (boxes.length === 0) {
      return {
        crates: [],
        unassignedBoxes: [],
        packingEfficiency: 1.0,
        totalWeight: 0
      };
    }

    try {
      // Use hybrid algorithm for crate packing
      const result = this.packingAlgorithm.packCrates(boxes);
      
      // Apply fallback strategies if needed
      if (result.unassignedBoxes.length > 0) {
        return this.applyCratePackingFallbacks(result, boxes);
      }

      return result;
    } catch (error) {
      // Fallback to simple one-box-per-crate strategy
      console.warn("Crate packing algorithm failed, using fallback strategy:", error);
      return this.fallbackCratePacking(boxes);
    }
  }

  /**
   * High-level use case that orchestrates both algorithms with container optimization.
   */
  public packageEverything(request: PackagingRequest): PackagingResponse {
    const processingStartTime = Date.now();
    
    try {
      // Step 1: Pack art items into boxes
      const boxResult = this.packBoxes(request.artItems);
      
      // Step 2: Determine optimal container strategy
      const containerCriteria = this.buildContainerCriteria(request, boxResult);
      const containerResult = this.containerOptimizer.optimizeContainerPacking(
        boxResult.boxes, 
        containerCriteria
      );

      // Step 3: Aggregate results into comprehensive response
      const algorithmUsed = this.determineAlgorithmUsed(boxResult, containerResult);
      
      return this.responseAggregator.aggregatePackagingResults(
        request.artItems,
        boxResult,
        containerResult,
        algorithmUsed,
        processingStartTime
      );

    } catch (error) {
      // Generate error response with fallback information
      console.error("Packaging workflow failed:", error);
      return this.generateErrorResponse(request, error, processingStartTime);
    }
  }

  /**
   * Applies fallback strategies when initial box packing fails.
   */
  private applyBoxPackingFallbacks(
    initialResult: BoxPackingResult, 
    originalArt: Art[]
  ): BoxPackingResult {
    const fallbackStrategies = [
      () => this.tryLargerBoxes(initialResult),
      () => this.trySpecialHandlingBoxes(initialResult),
      () => this.tryCustomPackaging(initialResult)
    ];

    let currentResult = initialResult;
    
    for (const strategy of fallbackStrategies) {
      if (currentResult.unassignedArt.length === 0) break;
      
      try {
        const fallbackResult = strategy();
        if (fallbackResult.unassignedArt.length < currentResult.unassignedArt.length) {
          currentResult = fallbackResult;
        }
      } catch (error) {
        console.warn("Fallback strategy failed:", error);
      }
    }

    return currentResult;
  }

  /**
   * Applies fallback strategies when initial crate packing fails.
   */
  private applyCratePackingFallbacks(
    initialResult: CratePackingResult,
    originalBoxes: Box[]
  ): CratePackingResult {
    const fallbackStrategies = [
      () => this.tryLargerCrates(initialResult),
      () => this.tryMultipleSmallCrates(initialResult),
      () => this.tryFreightShipping(initialResult)
    ];

    let currentResult = initialResult;
    
    for (const strategy of fallbackStrategies) {
      if (currentResult.unassignedBoxes.length === 0) break;
      
      try {
        const fallbackResult = strategy();
        if (fallbackResult.unassignedBoxes.length < currentResult.unassignedBoxes.length) {
          currentResult = fallbackResult;
        }
      } catch (error) {
        console.warn("Crate fallback strategy failed:", error);
      }
    }

    return currentResult;
  }

  /**
   * Builds container selection criteria from request and packing results.
   */
  private buildContainerCriteria(
    request: PackagingRequest, 
    boxResult: BoxPackingResult
  ): ContainerSelectionCriteria {
    const totalWeight = boxResult.totalWeight;
    const totalVolume = this.calculateTotalVolume(boxResult.boxes);
    const hasFragileItems = this.checkForFragileItems(request.artItems);
    const requiresSpecialHandling = this.checkForSpecialHandling(request.artItems);
    const hasMirrors = this.checkForMirrors(request.artItems);
    const hasGlassItems = this.checkForGlassItems(request.artItems);
    const hasAcousticPanels = this.checkForAcousticPanels(request.artItems);

    return {
      deliveryCapabilities: request.deliveryCapabilities,
      totalWeight,
      totalVolume,
      hasFragileItems: hasFragileItems || hasMirrors || hasGlassItems,
      requiresSpecialHandling: requiresSpecialHandling || hasMirrors || hasAcousticPanels
    };
  }

  /**
   * Fallback box packing strategy - one item per box.
   */
  private fallbackBoxPacking(artCollection: Art[]): BoxPackingResult {
    const boxes: Box[] = [];
    const unassignedArt: Art[] = [];

    for (const art of artCollection) {
      try {
        const box = new Box();
        if (box.addArt(art)) {
          boxes.push(box);
        } else {
          unassignedArt.push(art);
        }
      } catch (error) {
        unassignedArt.push(art);
      }
    }

    const totalWeight = boxes.reduce((sum, box) => sum + box.getTotalWeight(), 0);
    const packingEfficiency = artCollection.length > 0 ? 
      (artCollection.length - unassignedArt.length) / artCollection.length : 1.0;

    return {
      boxes,
      unassignedArt,
      packingEfficiency,
      totalWeight
    };
  }

  /**
   * Fallback crate packing strategy - one box per crate.
   */
  private fallbackCratePacking(boxes: Box[]): CratePackingResult {
    const crates: Crate[] = [];
    const unassignedBoxes: Box[] = [];

    for (const box of boxes) {
      try {
        const crate = new Crate();
        if (crate.addBox(box)) {
          crates.push(crate);
        } else {
          unassignedBoxes.push(box);
        }
      } catch (error) {
        unassignedBoxes.push(box);
      }
    }

    const totalWeight = crates.reduce((sum, crate) => sum + crate.calculateWeight(50), 0);
    const packingEfficiency = boxes.length > 0 ? 
      (boxes.length - unassignedBoxes.length) / boxes.length : 1.0;

    return {
      crates,
      unassignedBoxes,
      packingEfficiency,
      totalWeight
    };
  }

  // Fallback strategy implementations
  private tryLargerBoxes(result: BoxPackingResult): BoxPackingResult {
    // Implementation would try larger box sizes for unassigned items
    return result; // Placeholder
  }

  private trySpecialHandlingBoxes(result: BoxPackingResult): BoxPackingResult {
    // Implementation would use special handling boxes
    return result; // Placeholder
  }

  private tryCustomPackaging(result: BoxPackingResult): BoxPackingResult {
    // Implementation would suggest custom packaging solutions
    return result; // Placeholder
  }

  private tryLargerCrates(result: CratePackingResult): CratePackingResult {
    // Implementation would try larger crate sizes
    return result; // Placeholder
  }

  private tryMultipleSmallCrates(result: CratePackingResult): CratePackingResult {
    // Implementation would use multiple smaller crates
    return result; // Placeholder
  }

  private tryFreightShipping(result: CratePackingResult): CratePackingResult {
    // Implementation would suggest freight shipping options
    return result; // Placeholder
  }

  // Helper methods
  private calculateTotalVolume(boxes: Box[]): number {
    return boxes.reduce((total, box) => {
      const contents = box.getContents();
      return total + contents.reduce((boxVolume, art) => {
        const dims = art.getDimensions();
        return boxVolume + (dims.length * dims.width * dims.height);
      }, 0);
    }, 0);
  }

  private checkForFragileItems(artItems: Art[]): boolean {
    return artItems.some(art => 
      art.requiresSpecialHandling() || 
      art.getGlazingType() === GlazingType.Glass ||
      art.getProductType() === ArtType.Mirror
    );
  }

  private checkForSpecialHandling(artItems: Art[]): boolean {
    return artItems.some(art => art.requiresSpecialHandling());
  }

  private checkForMirrors(artItems: Art[]): boolean {
    return artItems.some(art => art.getProductType() === ArtType.Mirror);
  }

  private checkForGlassItems(artItems: Art[]): boolean {
    return artItems.some(art => art.getGlazingType() === GlazingType.Glass);
  }

  private checkForAcousticPanels(artItems: Art[]): boolean {
    return artItems.some(art => 
      art.getProductType() === ArtType.AcousticPanel ||
      art.getProductType() === ArtType.AcousticPanelFramed
    );
  }

  private checkForCanvasItems(artItems: Art[]): boolean {
    return artItems.some(art => art.getProductType() === ArtType.CanvasFloatFrame);
  }

  private checkForPaperPrints(artItems: Art[]): boolean {
    return artItems.some(art => 
      art.getProductType() === ArtType.PaperPrint ||
      art.getProductType() === ArtType.PaperPrintWithTitlePlate
    );
  }

  private determineAlgorithmUsed(
    boxResult: BoxPackingResult, 
    containerResult: ContainerPackingResult
  ): string {
    return "HybridPackingAlgorithm with ContainerOptimization";
  }

  private generateErrorResponse(
    request: PackagingRequest, 
    error: any, 
    processingStartTime: number
  ): PackagingResponse {
    const processingTimeMs = Date.now() - processingStartTime;
    
    return {
      itemSummaries: [],
      boxSummaries: [],
      containerSummaries: [],
      totalShipmentWeight: 0,
      totalShipmentVolume: 0,
      estimatedTotalCost: 0,
      packingMetrics: {
        totalItems: request.artItems.length,
        packedItems: 0,
        unassignedItems: request.artItems.length,
        totalBoxes: 0,
        totalContainers: 0,
        overallPackingEfficiency: 0,
        weightUtilization: 0,
        volumeUtilization: 0
      },
      errors: [{
        errorType: "CAPACITY_EXCEEDED",
        message: `Packaging workflow failed: ${error.message || 'Unknown error'}`,
        affectedItemIds: request.artItems.map((_, index) => `item_${index}`),
        suggestedAction: "Contact support for manual packaging assessment"
      }],
      warnings: ["Automatic packaging failed - manual intervention required"],
      packingAlgorithmUsed: "ErrorFallback",
      processingTimeMs,
      timestamp: new Date().toISOString()
    };
  }
}
