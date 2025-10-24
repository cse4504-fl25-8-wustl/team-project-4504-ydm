import { DimensionUtils } from "../utils/DimensionUtils";

/**
 * Art represents a physical piece that must be packaged.
 * This is a clean domain entity focused solely on representing art piece data.
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
  PaperPrint,
  PaperPrintWithTitlePlate,
  CanvasFloatFrame,
  WallDecor,
  AcousticPanel,
  AcousticPanelFramed,
  MetalPrint,
  Mirror,
  PatientBoard,
}

export enum ArtMaterial {
  Glass,
  Acrylic,
  CanvasFramed,
  CanvasGallery,
  Mirror,
  AcousticPanel,
  AcousticPanelFramed,
  PatientBoard,
  NoGlazing,
  Unknown,
}

export enum SpecialHandlingFlag {
  TactilePanel,
  RaisedFloat,
  ManualReview,
}

// We keep a lookup table so the domain logic can use numeric enums (as requested by code review)
// while consumers that emit JSON/logs can still retrieve the human-readable string representation
// that existed before (e.g., "PAPER_PRINT").
const ART_TYPE_LABELS: Record<ArtType, string> = {
  [ArtType.PaperPrint]: "PAPER_PRINT",
  [ArtType.PaperPrintWithTitlePlate]: "PAPER_PRINT_WITH_TITLE_PLATE",
  [ArtType.CanvasFloatFrame]: "CANVAS_FLOAT_FRAME",
  [ArtType.WallDecor]: "WALL_DECOR",
  [ArtType.AcousticPanel]: "ACOUSTIC_PANEL",
  [ArtType.AcousticPanelFramed]: "ACOUSTIC_PANEL_FRAMED",
  [ArtType.MetalPrint]: "METAL_PRINT",
  [ArtType.Mirror]: "MIRROR",
  [ArtType.PatientBoard]: "PATIENT_BOARD",
};

// Same rationale as ART_TYPE_LABELS: the mapping lets the parser convert inbound strings to enums
// and later turn enums back into strings when serialising results.
const ART_MATERIAL_LABELS: Record<ArtMaterial, string> = {
  [ArtMaterial.Glass]: "GLASS",
  [ArtMaterial.Acrylic]: "ACRYLIC",
  [ArtMaterial.CanvasFramed]: "CANVAS_FRAMED",
  [ArtMaterial.CanvasGallery]: "CANVAS_GALLERY",
  [ArtMaterial.Mirror]: "MIRROR",
  [ArtMaterial.AcousticPanel]: "ACOUSTIC_PANEL",
  [ArtMaterial.AcousticPanelFramed]: "ACOUSTIC_PANEL_FRAMED",
  [ArtMaterial.PatientBoard]: "PATIENT_BOARD",
  [ArtMaterial.NoGlazing]: "NO_GLAZING",
  [ArtMaterial.Unknown]: "UNKNOWN",
};

export function getArtTypeLabel(type: ArtType): string {
  return ART_TYPE_LABELS[type];
}

export function getArtMaterialLabel(material: ArtMaterial): string {
  return ART_MATERIAL_LABELS[material];
}

export interface ArtCreationOptions {
  id: string;
  productType: ArtType;
  material: ArtMaterial;
  dimensions: Dimensions;
  quantity?: number;
  specialHandlingFlags?: SpecialHandlingFlag[];
  description?: string;
  finalMediumLabel?: string;
  glazingLabel?: string;
  hardwareLabel?: string;
  hardwarePiecesPerItem?: number;
}

const DEFAULT_DEPTH_PADDING_INCHES = 4;

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
    this.quantity = options.quantity ?? 1;
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

  public getProductTypeLabel(): string {
    return getArtTypeLabel(this.productType);
  }

  public getMaterial(): ArtMaterial {
    return this.material;
  }

  public getMaterialLabel(): string {
    return getArtMaterialLabel(this.material);
  }

  public getQuantity(): number {
    return this.quantity;
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
    const piecesPerItem = this.hardwarePiecesPerItem ?? 0;
    return piecesPerItem * this.quantity;
  }

  /**
   * Gets the rounded dimensions of the art piece
   */
  public getDimensions(): { length: number; width: number; height: number } {
    return {
      length: DimensionUtils.roundUpDimension(this.length),
      width: DimensionUtils.roundUpDimension(this.width),
      height: DimensionUtils.roundUpDimension(this.depth),
    };
  }

  /**
   * Gets the raw (unrounded) dimensions for calculations
   */
  public getRawDimensions(): { length: number; width: number; height: number } {
    return {
      length: this.length,
      width: this.width,
      height: this.depth,
    };
  }

  public getDepth(): number {
    return DimensionUtils.roundUpDimension(this.depth);
  }

  public getSpecialHandlingFlags(): SpecialHandlingFlag[] {
    return Array.from(this.flags);
  }

}
