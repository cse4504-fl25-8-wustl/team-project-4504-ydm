/**
 * ArtTranslator handles the conversion from CSV data to Art domain entities.
 * This separates CSV parsing concerns from the Art entity itself.
 */
import { Art, ArtType, ArtMaterial, SpecialHandlingFlag, ArtCreationOptions } from "../entities/Art";

export interface ArtTranslationResult {
  artItems: Art[];
  errors: string[];
}

export class ArtTranslator {
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

  /**
   * Translates CSV row data into Art entities.
   * Creates separate Art instances for each physical piece (quantity > 1).
   */
  public static translateFromCsvRow(row: Record<string, string>): ArtTranslationResult {
    const errors: string[] = [];
    const artItems: Art[] = [];

    try {
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

      const baseId = (row.tagNumber || row.lineNumber || row.finalMedium || Math.random().toString(36).slice(2)).toString();

      // Create separate Art instances for each physical piece
      for (let i = 0; i < finalQuantity; i++) {
        const uniqueId = finalQuantity > 1 ? `${baseId}-${i + 1}` : baseId;
        
        const art = new Art({
          id: uniqueId,
          productType: mediumInfo.type,
          material,
          dimensions: {
            length,
            width,
          },
          specialHandlingFlags: mediumInfo.defaultFlags,
          description: row.finalMedium,
          finalMediumLabel: row.finalMedium,
          glazingLabel: row.glazing,
          hardwareLabel,
          hardwarePiecesPerItem,
        });

        artItems.push(art);
      }

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown translation error');
    }

    return { artItems, errors };
  }

  private static normalizeLabel(value: string | undefined): string {
    return (value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
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
