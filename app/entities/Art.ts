/**
 * Art represents a physical piece that must be packaged. The implementation captures the
 * attributes required by downstream packing rules: product category, material weights,
 * exterior dimensions (including depth padding), quantity, and special-handling flags.
 */
export interface Dimensions {
  /** Outside length in inches (longest horizontal edge). */
  length: number;
  /** Outside width in inches (shorter horizontal edge). */
  width: number;
  /** Outside depth in inches (thickness). */
  height?: number;
}

export enum ArtType {
  FramedPrint = "FRAMED_PRINT",
  Canvas = "CANVAS",
  AcousticPanel = "ACOUSTIC_PANEL",
  AcousticPanelFramed = "ACOUSTIC_PANEL_FRAMED",
  Mirror = "MIRROR",
  WallDecor = "WALL_DECOR",
  PatientBoard = "PATIENT_BOARD",
  Other = "OTHER",
}

export enum ArtMaterial {
  Glass = "GLASS",
  Acrylic = "ACRYLIC",
  CanvasFramed = "CANVAS_FRAMED",
  CanvasGallery = "CANVAS_GALLERY",
  Mirror = "MIRROR",
  AcousticPanel = "ACOUSTIC_PANEL",
  AcousticPanelFramed = "ACOUSTIC_PANEL_FRAMED",
  PatientBoard = "PATIENT_BOARD",
  Unknown = "UNKNOWN",
}

export enum SpecialHandlingFlag {
  TactilePanel = "TACTILE_PANEL",
  RaisedFloat = "RAISED_FLOAT",
  ManualReview = "MANUAL_REVIEW",
}

export interface ArtCreationOptions {
  id: string;
  productType: ArtType;
  material: ArtMaterial;
  dimensions: Dimensions;
  quantity?: number;
  specialHandlingFlags?: SpecialHandlingFlag[];
  description?: string;
}

const MATERIAL_WEIGHT_LB_PER_SQIN: Record<ArtMaterial, number> = {
  [ArtMaterial.Glass]: 0.0098,
  [ArtMaterial.Acrylic]: 0.0094,
  [ArtMaterial.CanvasFramed]: 0.0085,
  [ArtMaterial.CanvasGallery]: 0.0061,
  [ArtMaterial.Mirror]: 0.0191,
  [ArtMaterial.AcousticPanel]: 0.0038,
  [ArtMaterial.AcousticPanelFramed]: 0.0037,
  [ArtMaterial.PatientBoard]: 0.0347,
  [ArtMaterial.Unknown]: 0.0,
};

const DEFAULT_DEPTH_PADDING_INCHES = 4;

/**
 * Rule 11: round all weights and dimensions up to the next whole number to stay conservative.
 */
function roundUp(value: number): number {
  return Math.ceil(value);
}

export class Art {
  private readonly id: string;
  private readonly productType: ArtType;
  private readonly material: ArtMaterial;
  private readonly length: number;
  private readonly width: number;
  private readonly depth: number;
  private readonly quantity: number;
  private readonly flags: Set<SpecialHandlingFlag>;
  private readonly description?: string;

  constructor(options: ArtCreationOptions) {
    this.id = options.id;
    this.productType = options.productType;
    this.material = options.material;
    this.length = options.dimensions.length;
    this.width = options.dimensions.width;
    const depth = options.dimensions.height ?? DEFAULT_DEPTH_PADDING_INCHES;
    this.depth = depth;
    this.quantity = options.quantity ?? 1;
    this.flags = new Set(options.specialHandlingFlags ?? []);
    this.description = options.description;
  }

  public getId(): string {
    return this.id;
  }

  public getDescription(): string | undefined {
    return this.description;
  }

  public getProductType(): ArtType {
    return this.productType;
  }

  public getMaterial(): ArtMaterial {
    return this.material;
  }

  public getQuantity(): number {
    return this.quantity;
  }

  public getDimensions(): { length: number; width: number; height: number } {
    return {
      length: roundUp(this.length),
      width: roundUp(this.width),
      height: roundUp(this.depth),
    };
  }

  public getDepth(): number {
    return roundUp(this.depth);
  }

  public getWeight(): number {
    const weightFactor = MATERIAL_WEIGHT_LB_PER_SQIN[this.material] ?? 0;
    const surfaceArea = this.length * this.width;
    const rawWeight = surfaceArea * weightFactor * this.quantity;
    return roundUp(rawWeight);
  }

  public requiresSpecialHandling(): boolean {
    if (this.flags.size > 0) {
      return true;
    }

    return (
      this.productType === ArtType.Mirror ||
      this.productType === ArtType.WallDecor ||
      this.productType === ArtType.AcousticPanelFramed ||
      this.productType === ArtType.PatientBoard
    );
  }

  public requiresCrateOnly(): boolean {
    return this.productType === ArtType.Mirror;
  }

  public isOversized(): boolean {
    const dimensions = this.getDimensions();
    if (dimensions.length > 44 || dimensions.width > 44) {
      return true;
    }
    if (dimensions.length > 36 || dimensions.width > 36) {
      return true;
    }
    return dimensions.length >= 36.5 && dimensions.width >= 36.5;
  }

  public needsCustomPackaging(): boolean {
    const dimensions = this.getDimensions();
    return dimensions.length > 44 || dimensions.width > 44;
  }

  public getLargestDimension(): number {
    const dims = this.getDimensions();
    return Math.max(dims.length, dims.width, dims.height);
  }

  public getPlanarFootprint(): { longSide: number; shortSide: number } {
    const dims = this.getDimensions();
    const ordered = [dims.length, dims.width].sort((a, b) => b - a);
    return {
      longSide: ordered[0],
      shortSide: ordered[1],
    };
  }

  public getSpecialHandlingFlags(): SpecialHandlingFlag[] {
    return Array.from(this.flags);
  }
}
