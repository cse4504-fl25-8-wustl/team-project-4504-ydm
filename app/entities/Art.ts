/**
 * Art represents a single piece to be packed. The eventual implementation must provide:
 * - Constructor or factory receiving identifiers, product type (ArtType), dimensions, weight,
 *   and any special-handling flags parsed from the CSV.
 * - Immutable getters so interactors and boxes can query characteristics without mutating state.
 * - Derived helpers (e.g., getLargestDimension) used by packing rules to quickly determine fit.
 * When these methods are implemented according to the above, the rest of the pipeline
 * (parser -> interactor -> response) will have all the data required to evaluate capacity,
 * weight, and handling rules.
 */
export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export enum ArtType {
  // Final Medium types from your business requirements
  PaperPrint = "PAPER_PRINT",
  PaperPrintWithTitlePlate = "PAPER_PRINT_WITH_TITLE_PLATE",
  CanvasFloatFrame = "CANVAS_FLOAT_FRAME",
  WallDecor = "WALL_DECOR",
  AcousticPanel = "ACOUSTIC_PANEL",
  AcousticPanelFramed = "ACOUSTIC_PANEL_FRAMED",
  MetalPrint = "METAL_PRINT",
  Mirror = "MIRROR",
}

export enum GlazingType {
  Glass = "GLASS",
  Acrylic = "ACRYLIC",
  NoGlazing = "NO_GLAZING",
}

export class Art {
  private readonly sku: string;
  private readonly productType: ArtType;
  private readonly glazingType: GlazingType;
  private readonly dimensions: Dimensions;
  private readonly weight: number;
  private readonly specialHandling: boolean;

  constructor(
    sku: string,
    productType: ArtType,
    glazingType: GlazingType,
    dimensions: Dimensions,
    weight: number,
    specialHandling: boolean = false
  ) {
    this.sku = sku;
    this.productType = productType;
    this.glazingType = glazingType;
    this.dimensions = dimensions;
    this.weight = weight;
    this.specialHandling = specialHandling;
  }

  public getSku(): string {
    return this.sku;
  }

  public getProductType(): ArtType {
    return this.productType;
  }

  public getGlazingType(): GlazingType {
    return this.glazingType;
  }

  public getDimensions(): Dimensions {
    return { ...this.dimensions };
  }

  public getWeight(): number {
    return this.weight;
  }

  public requiresSpecialHandling(): boolean {
    return this.specialHandling;
  }

  public getLargestDimension(): number {
    return Math.max(this.dimensions.length, this.dimensions.width, this.dimensions.height);
  }

  public getVolume(): number {
    return this.dimensions.length * this.dimensions.width * this.dimensions.height;
  }

  /**
   * Factory method to create Art from CSV row data
   */
  public static fromCsvRow(row: Record<string, string>): Art {
    const sku = row.sku || row.SKU || row.id || row.ID;
    if (!sku) {
      throw new Error("Missing required field: SKU");
    }

    // Parse product type (Final Medium)
    const productTypeStr = (row.productType || row.product_type || row.type || row.TYPE || "").toUpperCase();
    let productType: ArtType;
    switch (productTypeStr) {
      case "PAPER_PRINT":
        productType = ArtType.PaperPrint;
        break;
      case "PAPER_PRINT_WITH_TITLE_PLATE":
        productType = ArtType.PaperPrintWithTitlePlate;
        break;
      case "CANVAS_FLOAT_FRAME":
        productType = ArtType.CanvasFloatFrame;
        break;
      case "WALL_DECOR":
        productType = ArtType.WallDecor;
        break;
      case "ACOUSTIC_PANEL":
        productType = ArtType.AcousticPanel;
        break;
      case "ACOUSTIC_PANEL_FRAMED":
        productType = ArtType.AcousticPanelFramed;
        break;
      case "METAL_PRINT":
        productType = ArtType.MetalPrint;
        break;
      case "MIRROR":
        productType = ArtType.Mirror;
        break;
      default:
        throw new Error(`Invalid product type: ${productTypeStr}. Expected: PAPER_PRINT, PAPER_PRINT_WITH_TITLE_PLATE, CANVAS_FLOAT_FRAME, WALL_DECOR, ACOUSTIC_PANEL, ACOUSTIC_PANEL_FRAMED, METAL_PRINT, MIRROR`);
    }

    // Parse glazing type
    const glazingTypeStr = (row.glazingType || row.glazing_type || row.glazing || row.GLAZING || "").toUpperCase();
    let glazingType: GlazingType;
    switch (glazingTypeStr) {
      case "GLASS":
        glazingType = GlazingType.Glass;
        break;
      case "ACRYLIC":
        glazingType = GlazingType.Acrylic;
        break;
      case "NO_GLAZING":
      case "NO GLAZING":
        glazingType = GlazingType.NoGlazing;
        break;
      default:
        throw new Error(`Invalid glazing type: ${glazingTypeStr}. Expected: GLASS, ACRYLIC, NO_GLAZING`);
    }

    const length = parseFloat(row.length || row.Length || row.l || row.L || "0");
    const width = parseFloat(row.width || row.Width || row.w || row.W || "0");
    const height = parseFloat(row.height || row.Height || row.h || row.H || "0");

    if (length <= 0 || width <= 0 || height <= 0) {
      throw new Error(`Invalid dimensions: length=${length}, width=${width}, height=${height}. All dimensions must be positive.`);
    }

    const weight = parseFloat(row.weight || row.Weight || row.wt || row.WT || "0");
    if (weight <= 0) {
      throw new Error(`Invalid weight: ${weight}. Weight must be positive.`);
    }

    const specialHandling = parseBoolean(row.specialHandling || row.special_handling || row.special || row.SPECIAL || "false");

    return new Art(sku, productType, glazingType, { length, width, height }, weight, specialHandling);
  }
}

/**
 * Helper function to parse boolean values from CSV strings
 */
function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ["y", "yes", "true", "1", "special"].includes(normalized);
}
