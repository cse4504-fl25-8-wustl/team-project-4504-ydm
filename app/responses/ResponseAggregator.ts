import { Art, ArtType, GlazingType } from "../entities/Art";
import { Box } from "../entities/Box";
import { Crate } from "../entities/Crate";
import { 
  PackagingResponse, 
  ItemWeightSummary, 
  BoxPackingSummary, 
  ContainerSummary, 
  PackingMetrics, 
  PackingError,
  FallbackOptions,
  ContainerType
} from "./PackagingResponse";
import { BoxPackingResult, CratePackingResult } from "../interactors/PackingAlgorithms";
import { ContainerPackingResult } from "../interactors/ContainerOptimizer";

/**
 * Aggregates packing results into comprehensive response DTOs.
 * Handles complex packaging scenarios with detailed metrics and error reporting.
 */
export class ResponseAggregator {
  /**
   * Aggregates all packing results into a comprehensive PackagingResponse.
   */
  aggregatePackagingResults(
    originalArt: Art[],
    boxResult: BoxPackingResult,
    containerResult: ContainerPackingResult,
    algorithmUsed: string,
    processingStartTime: number
  ): PackagingResponse {
    const processingTimeMs = Date.now() - processingStartTime;
    
    const itemSummaries = this.createItemSummaries(originalArt, boxResult);
    const boxSummaries = this.createBoxSummaries(boxResult.boxes);
    const containerSummaries = this.createContainerSummaries(containerResult);
    const packingMetrics = this.calculatePackingMetrics(originalArt, boxResult, containerResult);
    const errors = this.identifyPackingErrors(boxResult, containerResult);
    const warnings = this.generateWarnings(boxResult, containerResult);
    const fallbackOptions = this.generateFallbackOptions(boxResult, containerResult);

    return {
      itemSummaries,
      boxSummaries,
      containerSummaries,
      totalShipmentWeight: this.calculateTotalWeight(containerResult.containers),
      totalShipmentVolume: this.calculateTotalVolume(containerResult.containers),
      estimatedTotalCost: containerResult.totalCost,
      packingMetrics,
      errors,
      warnings,
      fallbackOptions: fallbackOptions.availableAlternatives.length > 0 ? fallbackOptions : undefined,
      packingAlgorithmUsed: algorithmUsed,
      processingTimeMs,
      timestamp: new Date().toISOString()
    };
  }

  private createItemSummaries(originalArt: Art[], boxResult: BoxPackingResult): ItemWeightSummary[] {
    const summaries: ItemWeightSummary[] = [];
    
    // Create summaries for packed items
    for (const box of boxResult.boxes) {
      for (const art of box.getContents()) {
        summaries.push({
          itemId: this.generateItemId(art),
          weight: art.getWeight(),
          dimensions: art.getDimensions(),
          productType: this.getProductTypeString(art.getProductType()),
          requiresSpecialHandling: this.requiresSpecialHandling(art),
          packingStatus: "PACKED"
        });
      }
    }

    // Create summaries for unassigned items
    for (const art of boxResult.unassignedArt) {
      summaries.push({
        itemId: this.generateItemId(art),
        weight: art.getWeight(),
        dimensions: art.getDimensions(),
        productType: this.getProductTypeString(art.getProductType()),
        requiresSpecialHandling: this.requiresSpecialHandling(art),
        packingStatus: "UNASSIGNED",
        errorMessage: "Could not fit in available containers"
      });
    }

    return summaries;
  }

  private createBoxSummaries(boxes: Box[]): BoxPackingSummary[] {
    return boxes.map(box => {
      const contents = box.getContents();
      const utilizationPercentage = this.calculateBoxUtilization(box);
      
      return {
        boxId: this.generateBoxId(box),
        itemIds: contents.map(art => this.generateItemId(art)),
        weight: box.getTotalWeight(),
        dimensions: this.getBoxDimensions(box),
        utilizationPercentage,
        packingEfficiency: utilizationPercentage / 100,
        packingStatus: box.isAtCapacity() ? "PACKED" : "PACKED"
      };
    });
  }

  private createContainerSummaries(containerResult: ContainerPackingResult): ContainerSummary[] {
    return containerResult.containers.map(container => {
      const contents = container.getContents();
      const utilizationPercentage = this.calculateContainerUtilization(container);
      
      return {
        containerId: this.generateContainerId(container),
        type: containerResult.containerType,
        boxIds: contents.map(box => this.generateBoxId(box)),
        weight: container.calculateWeight(this.getContainerOverhead(containerResult.containerType)),
        height: this.getContainerHeight(container),
        dimensions: this.getContainerDimensions(container),
        utilizationPercentage,
        estimatedCost: this.estimateContainerCost(container, containerResult.containerType),
        packingReasoning: containerResult.reasoning
      };
    });
  }

  private calculatePackingMetrics(
    originalArt: Art[],
    boxResult: BoxPackingResult,
    containerResult: ContainerPackingResult
  ): PackingMetrics {
    const totalItems = originalArt.length;
    const packedItems = boxResult.boxes.reduce((sum, box) => sum + box.getContents().length, 0);
    const unassignedItems = boxResult.unassignedArt.length;
    
    const totalBoxes = boxResult.boxes.length;
    const totalContainers = containerResult.containers.length;
    
    const overallPackingEfficiency = totalItems > 0 ? packedItems / totalItems : 1;
    
    // Calculate weight utilization
    const totalArtWeight = originalArt.reduce((sum, art) => sum + art.getWeight(), 0);
    const totalContainerCapacity = this.calculateTotalContainerCapacity(containerResult.containers);
    const weightUtilization = totalContainerCapacity > 0 ? totalArtWeight / totalContainerCapacity : 0;
    
    // Calculate volume utilization
    const totalArtVolume = originalArt.reduce((sum, art) => {
      const dims = art.getDimensions();
      return sum + (dims.length * dims.width * dims.height);
    }, 0);
    const totalContainerVolume = this.calculateTotalContainerVolume(containerResult.containers);
    const volumeUtilization = totalContainerVolume > 0 ? totalArtVolume / totalContainerVolume : 0;

    return {
      totalItems,
      packedItems,
      unassignedItems,
      totalBoxes,
      totalContainers,
      overallPackingEfficiency,
      weightUtilization,
      volumeUtilization
    };
  }

  private identifyPackingErrors(
    boxResult: BoxPackingResult,
    containerResult: ContainerPackingResult
  ): PackingError[] {
    const errors: PackingError[] = [];

    // Check for unassigned art items
    if (boxResult.unassignedArt.length > 0) {
      errors.push({
        errorType: "CAPACITY_EXCEEDED",
        message: `${boxResult.unassignedArt.length} items could not be packed into available boxes`,
        affectedItemIds: boxResult.unassignedArt.map(art => this.generateItemId(art)),
        suggestedAction: "Consider using larger boxes or custom packaging solutions"
      });
    }

    // Check for unassigned boxes
    if (containerResult.unassignedBoxes.length > 0) {
      errors.push({
        errorType: "CAPACITY_EXCEEDED",
        message: `${containerResult.unassignedBoxes.length} boxes could not be packed into available containers`,
        affectedItemIds: containerResult.unassignedBoxes.flatMap(box => 
          box.getContents().map(art => this.generateItemId(art))
        ),
        suggestedAction: "Consider using additional containers or freight shipping"
      });
    }

    // Check for special handling requirements
    const specialHandlingItems = boxResult.boxes.flatMap(box => 
      box.getContents().filter(art => this.requiresSpecialHandling(art))
    );
    
    if (specialHandlingItems.length > 0) {
      const mirrorCount = specialHandlingItems.filter(art => art.getProductType() === ArtType.Mirror).length;
      const glassCount = specialHandlingItems.filter(art => art.getGlazingType() === GlazingType.Glass).length;
      const acousticCount = specialHandlingItems.filter(art => 
        art.getProductType() === ArtType.AcousticPanel || 
        art.getProductType() === ArtType.AcousticPanelFramed
      ).length;
      
      let message = `${specialHandlingItems.length} items require special handling:`;
      if (mirrorCount > 0) message += ` ${mirrorCount} mirrors,`;
      if (glassCount > 0) message += ` ${glassCount} glass items,`;
      if (acousticCount > 0) message += ` ${acousticCount} acoustic panels,`;
      message = message.replace(/,$/, ''); // Remove trailing comma
      
      errors.push({
        errorType: "SPECIAL_HANDLING",
        message,
        affectedItemIds: specialHandlingItems.map(art => this.generateItemId(art)),
        suggestedAction: "Ensure proper padding, crating for mirrors, and handling instructions are included"
      });
    }

    return errors;
  }

  private generateWarnings(
    boxResult: BoxPackingResult,
    containerResult: ContainerPackingResult
  ): string[] {
    const warnings: string[] = [];

    // Low packing efficiency warning
    if (boxResult.packingEfficiency < 0.7) {
      warnings.push(`Low box packing efficiency: ${(boxResult.packingEfficiency * 100).toFixed(1)}%`);
    }

    if (containerResult.packingEfficiency < 0.7) {
      warnings.push(`Low container packing efficiency: ${(containerResult.packingEfficiency * 100).toFixed(1)}%`);
    }

    // Weight distribution warnings
    const heavyContainers = containerResult.containers.filter(container => 
      container.calculateWeight(0) > 2000 // Assuming 2000 lbs is heavy
    );
    
    if (heavyContainers.length > 0) {
      warnings.push(`${heavyContainers.length} containers exceed 2000 lbs - may require special handling`);
    }

    return warnings;
  }

  private generateFallbackOptions(
    boxResult: BoxPackingResult,
    containerResult: ContainerPackingResult
  ): FallbackOptions {
    const alternatives: string[] = [];
    let recommendedAction = "Current packing is optimal";
    let estimatedAdditionalCost = 0;
    let deliveryImpact = "No impact";

    if (boxResult.unassignedArt.length > 0 || containerResult.unassignedBoxes.length > 0) {
      alternatives.push("Custom packaging for oversized items");
      alternatives.push("Freight shipping for large items");
      alternatives.push("Multiple shipment approach");
      
      recommendedAction = "Consider custom packaging or freight shipping";
      estimatedAdditionalCost = 150; // Estimated additional cost
      deliveryImpact = "May require additional delivery coordination";
    }

    if (boxResult.packingEfficiency < 0.8) {
      alternatives.push("Optimize box sizes");
      alternatives.push("Consolidate similar items");
      
      if (recommendedAction === "Current packing is optimal") {
        recommendedAction = "Consider box size optimization";
      }
    }

    return {
      availableAlternatives: alternatives,
      recommendedAction,
      estimatedAdditionalCost,
      deliveryImpact
    };
  }

  // Helper methods for ID generation and calculations
  private generateItemId(art: Art): string {
    // Generate ID based on SKU if available, otherwise random
    const sku = art.getSku ? art.getSku() : 'unknown';
    return `${sku}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private getProductTypeString(productType: ArtType): string {
    switch (productType) {
      case ArtType.PaperPrint:
        return "Paper Print - Framed";
      case ArtType.PaperPrintWithTitlePlate:
        return "Print - Framed with Title Plate";
      case ArtType.CanvasFloatFrame:
        return "Canvas - Float Frame";
      case ArtType.WallDecor:
        return "Wall Décor";
      case ArtType.AcousticPanel:
        return "Acoustic Panel";
      case ArtType.AcousticPanelFramed:
        return "Acoustic Panel - Framed";
      case ArtType.MetalPrint:
        return "Metal Print";
      case ArtType.Mirror:
        return "Mirror";
      default:
        return "Unknown";
    }
  }

  private requiresSpecialHandling(art: Art): boolean {
    return art.requiresSpecialHandling() ||
           art.getGlazingType() === GlazingType.Glass ||
           art.getProductType() === ArtType.Mirror ||
           art.getProductType() === ArtType.AcousticPanel ||
           art.getProductType() === ArtType.AcousticPanelFramed;
  }

  private generateBoxId(box: Box): string {
    return `box_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateContainerId(container: Crate): string {
    return `container_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateBoxUtilization(box: Box): number {
    // Simplified calculation - in reality would consider volume and weight
    const contents = box.getContents();
    const maxCapacity = 10; // Assuming max 10 items per box
    return Math.min((contents.length / maxCapacity) * 100, 100);
  }

  private calculateContainerUtilization(container: Crate): number {
    // Simplified calculation
    const contents = container.getContents();
    const maxCapacity = 20; // Assuming max 20 boxes per container
    return Math.min((contents.length / maxCapacity) * 100, 100);
  }

  private getBoxDimensions(box: Box) {
    // Default box dimensions - in reality would be based on box type
    return { length: 24, width: 18, height: 12 };
  }

  private getContainerDimensions(container: Crate) {
    // Default container dimensions
    return { length: 48, width: 40, height: 48 };
  }

  private getContainerHeight(container: Crate): number {
    return this.getContainerDimensions(container).height;
  }

  private getContainerOverhead(containerType: ContainerType): number {
    return containerType === "CRATE" ? 50 : 75; // lbs
  }

  private estimateContainerCost(container: Crate, containerType: ContainerType): number {
    const baseCost = containerType === "CRATE" ? 25 : 15;
    const weightMultiplier = container.calculateWeight(0) / 1000; // Per 1000 lbs
    return baseCost + (weightMultiplier * 10);
  }

  private calculateTotalWeight(containers: Crate[]): number {
    return containers.reduce((sum, container) => sum + container.calculateWeight(50), 0);
  }

  private calculateTotalVolume(containers: Crate[]): number {
    return containers.reduce((sum, container) => {
      const dims = this.getContainerDimensions(container);
      return sum + (dims.length * dims.width * dims.height);
    }, 0);
  }

  private calculateTotalContainerCapacity(containers: Crate[]): number {
    // Simplified - assumes each container can hold 2000 lbs
    return containers.length * 2000;
  }

  private calculateTotalContainerVolume(containers: Crate[]): number {
    return containers.reduce((sum, container) => {
      const dims = this.getContainerDimensions(container);
      return sum + (dims.length * dims.width * dims.height);
    }, 0);
  }
}
