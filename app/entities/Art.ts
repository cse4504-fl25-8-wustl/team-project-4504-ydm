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
  PaperPrint = "PAPER_PRINT",
  PaperPrintWithTitlePlate = "PAPER_PRINT_WITH_TITLE_PLATE",
  CanvasFloatFrame = "CANVAS_FLOAT_FRAME",
  WallDecor = "WALL_DECOR",
  AcousticPanel = "ACOUSTIC_PANEL",
  AcousticPanelFramed = "ACOUSTIC_PANEL_FRAMED",
  MetalPrint = "METAL_PRINT",
  Mirror = "MIRROR",
  PatientBoard = "PATIENT_BOARD",
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
  NoGlazing = "NO_GLAZING",
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
  specialHandlingFlags?: SpecialHandlingFlag[];
  description?: string;
  finalMediumLabel?: string;
  glazingLabel?: string;
  hardwareLabel?: string;
  hardwarePiecesPerItem?: number;
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
  [ArtMaterial.NoGlazing]: 0.0,
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
  private readonly flags: Set<SpecialHandlingFlag>;
  private readonly description?: string;
  private readonly finalMediumLabel?: string;
  private readonly glazingLabel?: string;
  private readonly hardwareLabel?: string;
  private readonly hardwarePiecesPerItem?: number;


  constructor(options: ArtCreationOptions) {
    this.id = options.id;
    this.productType = options.productType;
    this.material = options.material;
    this.length = options.dimensions.length;
    this.width = options.dimensions.width;
    const depth = options.dimensions.height ?? DEFAULT_DEPTH_PADDING_INCHES;
    this.depth = depth;
    this.flags = new Set(options.specialHandlingFlags ?? []);
    this.description = options.description;
    this.finalMediumLabel = options.finalMediumLabel;
    this.glazingLabel = options.glazingLabel;
    this.hardwareLabel = options.hardwareLabel;
    this.hardwarePiecesPerItem = options.hardwarePiecesPerItem;
  }

  public getId(): string {
    return this.id;
  }

  public getSku(): string {
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


  public getFinalMediumLabel(): string | undefined {
    return this.finalMediumLabel;
  }

  public getGlazingLabel(): string | undefined {
    return this.glazingLabel;
  }

  public getHardwareLabel(): string | undefined {
    return this.hardwareLabel;
  }

  public getHardwarePiecesPerItem(): number | undefined {
    return this.hardwarePiecesPerItem;
  }

  public getHardwarePiecesTotal(): number {
    return this.hardwarePiecesPerItem ?? 0;
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
    const rawWeight = surfaceArea * weightFactor;
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
      this.material === ArtMaterial.Glass
    );
  }

  public requiresCrateOnly(): boolean {
    return this.productType === ArtType.Mirror;
  }

  public requiresOversizeBox(): boolean {
    const { PackagingRules } = require("../rules/PackagingRules");
    return PackagingRules.requiresOversizedBox(this);
  }

  public isOversized(): boolean {
    const { PackagingRules } = require("../rules/PackagingRules");
    return PackagingRules.isOversized(this);
  }

  public needsCustomPackaging(): boolean {
    const { PackagingRules } = require("../rules/PackagingRules");
    return PackagingRules.needsCustomPackaging(this);
  }

  public getLargestDimension(): number {
    const dims = this.getDimensions();
    return Math.max(dims.length, dims.width, dims.height);
  }

  public getPlanarFootprint(): { longSide: number; shortSide: number } {
    const { PackagingRules } = require("../rules/PackagingRules");
    return PackagingRules.getPlanarFootprint(this);
  }

  public getSpecialHandlingFlags(): SpecialHandlingFlag[] {
    return Array.from(this.flags);
  }

}
