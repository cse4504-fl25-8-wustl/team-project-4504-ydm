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

  public getMaterial(): ArtMaterial {
    return this.material;
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
