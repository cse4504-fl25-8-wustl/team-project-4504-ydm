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
  quantity?: number;
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

function normalizeLabel(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
  private readonly finalMediumLabel?: string;
  private readonly glazingLabel?: string;
  private readonly hardwareLabel?: string;
  private readonly hardwarePiecesPerItem?: number;

  private static readonly FINAL_MEDIUM_MAP: Record<string, { type: ArtType; material: ArtMaterial; defaultFlags?: SpecialHandlingFlag[]; }> = {
    "paper print - framed": { type: ArtType.PaperPrint, material: ArtMaterial.Glass },
    "print - framed with title plate": { type: ArtType.PaperPrintWithTitlePlate, material: ArtMaterial.Glass },
    "canvas - float frame": { type: ArtType.CanvasFloatFrame, material: ArtMaterial.CanvasFramed },
    "canvas - gallery": { type: ArtType.CanvasFloatFrame, material: ArtMaterial.CanvasGallery },
    "wall decor": { type: ArtType.WallDecor, material: ArtMaterial.Unknown },
    "wall décor": { type: ArtType.WallDecor, material: ArtMaterial.Unknown },
    "metal print": { type: ArtType.MetalPrint, material: ArtMaterial.Acrylic },
    "mirror": { type: ArtType.Mirror, material: ArtMaterial.Mirror },
    "acoustic panel": { type: ArtType.AcousticPanel, material: ArtMaterial.AcousticPanel },
    "acoustic panel - framed": { type: ArtType.AcousticPanelFramed, material: ArtMaterial.AcousticPanelFramed },
    "patient board": { type: ArtType.PatientBoard, material: ArtMaterial.PatientBoard },
  };

  private static readonly GLAZING_MAP: Record<string, ArtMaterial> = {
    "regular glass": ArtMaterial.Glass,
    glass: ArtMaterial.Glass,
    acrylic: ArtMaterial.Acrylic,
  };

  public static fromCsvRow(row: Record<string, string>): Art {
    const mediumKey = normalizeLabel(row.finalMedium);
    const mediumInfo = Art.FINAL_MEDIUM_MAP[mediumKey];
    if (!mediumInfo) {
      throw new Error(`Unknown final medium '${row.finalMedium ?? ""}'`);
    }

    const glazingKey = normalizeLabel(row.glazing);
    const glazingMaterial = glazingKey ? Art.GLAZING_MAP[glazingKey] : undefined;
    const material = glazingMaterial ?? mediumInfo.material;

    const rawWidth = Number(row.outsideWidth ?? row.width);
    const rawHeight = Number(row.outsideHeight ?? row.length);

    if (!Number.isFinite(rawWidth) || !Number.isFinite(rawHeight)) {
      throw new Error(`Invalid dimensions for '${row.finalMedium ?? ""}'`);
    }

    const quantity = Number(row.quantity ?? "1");
    const finalQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

    const length = Math.max(rawWidth, rawHeight);
    const width = Math.min(rawWidth, rawHeight);

    const hardwareLabel = row.hardware?.trim();
    const hardwarePiecesPerItem = Art.parseHardwarePieces(hardwareLabel);

    const id = (row.tagNumber || row.lineNumber || row.finalMedium || Math.random().toString(36).slice(2)).toString();

    return new Art({
      id,
      productType: mediumInfo.type,
      material,
      dimensions: {
        length,
        width,
      },
      quantity: finalQuantity,
      specialHandlingFlags: mediumInfo.defaultFlags,
      description: row.finalMedium,
      finalMediumLabel: row.finalMedium,
      glazingLabel: row.glazing,
      hardwareLabel,
      hardwarePiecesPerItem,
    });
  }

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
      this.material === ArtMaterial.Glass
    );
  }

  public requiresCrateOnly(): boolean {
    return this.productType === ArtType.Mirror;
  }

  public requiresOversizeBox(): boolean {
    const footprint = this.getPlanarFootprint();
    return (
      footprint.longSide > 36 &&
      footprint.shortSide > 36 &&
      footprint.longSide <= 43.5 &&
      footprint.shortSide <= 43.5
    );
  }

  public isOversized(): boolean {
    return this.requiresOversizeBox();
  }

  public needsCustomPackaging(): boolean {
    const footprint = this.getPlanarFootprint();
    return footprint.longSide > 43.5 && footprint.shortSide > 43.5;
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

  private static parseHardwarePieces(label?: string): number | undefined {
    if (!label) {
      return undefined;
    }

    const match = label.trim().match(/^(\d+)/);
    if (!match) {
      return undefined;
    }

    const value = Number(match[1]);
    return Number.isFinite(value) ? value : undefined;
  }
}
