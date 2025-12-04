import { Art, ArtType, ArtMaterial, SpecialHandlingFlag, ArtCreationOptions } from "../entities/Art";

/**
 * ArtTranslator handles the translation from CSV row data to Art entities.
 * This separates CSV parsing concerns from the domain entity.
 */
export class ArtTranslator {
  private static readonly FINAL_MEDIUM_MAP: Record<string, { type: ArtType; material: ArtMaterial; defaultFlags?: SpecialHandlingFlag[]; }> = {
    "paper print - framed": { type: ArtType.PaperPrint, material: ArtMaterial.Glass },
    "print - framed with title plate": { type: ArtType.PaperPrintWithTitlePlate, material: ArtMaterial.Glass },
    "canvas - float frame": { type: ArtType.CanvasFloatFrame, material: ArtMaterial.CanvasFramed },
    "canvas - gallery": { type: ArtType.CanvasFloatFrame, material: ArtMaterial.CanvasGallery },
    "canvas": { type: ArtType.CanvasFloatFrame, material: ArtMaterial.CanvasFramed },
    "wall decor": { type: ArtType.WallDecor, material: ArtMaterial.Unknown },
    "wall décor": { type: ArtType.WallDecor, material: ArtMaterial.Unknown },
    "metal print": { type: ArtType.MetalPrint, material: ArtMaterial.Acrylic },
    "mirror": { type: ArtType.Mirror, material: ArtMaterial.Mirror },
    "acoustic panel": { type: ArtType.AcousticPanel, material: ArtMaterial.AcousticPanel },
    "acoustic panels": { type: ArtType.AcousticPanel, material: ArtMaterial.AcousticPanel },
    "acoustic panel - framed": { type: ArtType.AcousticPanelFramed, material: ArtMaterial.AcousticPanelFramed },
    "acoustic panels - framed": { type: ArtType.AcousticPanelFramed, material: ArtMaterial.AcousticPanelFramed },
    "patient board": { type: ArtType.PatientBoard, material: ArtMaterial.PatientBoard },
    // Print variations with raised mounting
    "print - raised mat": { type: ArtType.PaperPrint, material: ArtMaterial.Glass, defaultFlags: [SpecialHandlingFlag.RaisedFloat] },
    "print - raised float mount": { type: ArtType.PaperPrint, material: ArtMaterial.Glass, defaultFlags: [SpecialHandlingFlag.RaisedFloat] },
    "print - raised float mount with title plate": { type: ArtType.PaperPrintWithTitlePlate, material: ArtMaterial.Glass, defaultFlags: [SpecialHandlingFlag.RaisedFloat] },
    "print - raised float mount and raised mat": { type: ArtType.PaperPrint, material: ArtMaterial.Glass, defaultFlags: [SpecialHandlingFlag.RaisedFloat] },
    "print - raised float mount and deckled edge": { type: ArtType.PaperPrint, material: ArtMaterial.Glass, defaultFlags: [SpecialHandlingFlag.RaisedFloat] },
  };

  private static readonly GLAZING_MAP: Record<string, ArtMaterial> = {
    "regular glass": ArtMaterial.Glass,
    "glass": ArtMaterial.Glass,
    "acrylic": ArtMaterial.Acrylic,
    // Additional glass types
    "consv clear glass": ArtMaterial.Glass,
    "museum glass": ArtMaterial.Glass,
    "reflection control glass": ArtMaterial.Glass,
    // Additional acrylic types
    "regular acrylic": ArtMaterial.Acrylic,
    "non-glare acrylic": ArtMaterial.Acrylic,
    "mercy non-glare acrylic": ArtMaterial.Acrylic,
    // Note: "no glass" is intentionally NOT mapped - it should use the finalMedium's default material
  };

  /**
   * Normalizes labels for consistent lookup - centralized normalization strategy
   */
  private static normalizeLabel(value: string | undefined): string {
    return (value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  /**
   * Parses hardware pieces from label string
   */
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

  /**
   * Translates a CSV row into an Art entity
   */
  public static fromCsvRow(row: Record<string, string>): Art {
    const mediumKey = this.normalizeLabel(row.finalMedium);
    const mediumInfo = this.FINAL_MEDIUM_MAP[mediumKey];
    if (!mediumInfo) {
      throw new Error(`Unknown final medium '${row.finalMedium ?? ""}'`);
    }

    const glazingKey = this.normalizeLabel(row.glazing);
    const glazingMaterial = glazingKey ? this.GLAZING_MAP[glazingKey] : undefined;
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
    const hardwarePiecesPerItem = this.parseHardwarePieces(hardwareLabel);

    const id = (row.tagNumber || row.lineNumber || row.finalMedium || Math.random().toString(36).slice(2)).toString();

    const options: ArtCreationOptions = {
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
    };

    return new Art(options);
  }
}
