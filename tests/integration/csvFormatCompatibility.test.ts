import { describe, test, expect } from "vitest";
import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parse, parseWithDiagnostics } from "../../app/parser/CsvParser";
import { ArtType, ArtMaterial } from "../../app/entities/Art";

/**
 * Integration tests for CSV format compatibility with test_cases repository
 * These tests verify that the CSV parser can handle various input formats
 * that may appear in the test_cases directory.
 */
describe("CSV Format Compatibility Integration Tests", () => {
  async function createTempCsv(content: string): Promise<string> {
    const tempPath = join(tmpdir(), `test-csv-${Date.now()}-${Math.random()}.csv`);
    await writeFile(tempPath, content);
    return tempPath;
  }

  async function cleanup(path: string): Promise<void> {
    try {
      await unlink(path);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  describe("Paper Print - Framed formats", () => {
    test("handles standard paper print format", async () => {
      const csvContent = `line number, quantity, tag number, Final medium, Outside Size Width, Outside Size Height, Glazing, Frame 1 Moulding, Hardware
1, 4, 1, Paper Print - Framed, 33, 43, Regular Glass, N/A, N/A`;

      const tempPath = await createTempCsv(csvContent);
      const result = await parseWithDiagnostics(tempPath);

      expect(result.errors).toHaveLength(0);
      expect(result.artItems).toHaveLength(1);
      expect(result.artItems[0].getProductType()).toBe(ArtType.PaperPrint);
      expect(result.artItems[0].getMaterial()).toBe(ArtMaterial.Glass);
      expect(result.artItems[0].getQuantity()).toBe(4);

      await cleanup(tempPath);
    });

    test("handles paper print with acrylic glazing", async () => {
      const csvContent = `line number, quantity, tag number, Final medium, Outside Size Width, Outside Size Height, Glazing, Frame 1 Moulding, Hardware
1, 6, 1, Paper Print - Framed, 33, 43, Acrylic, N/A, N/A`;

      const tempPath = await createTempCsv(csvContent);
      const result = await parseWithDiagnostics(tempPath);

      expect(result.errors).toHaveLength(0);
      expect(result.artItems).toHaveLength(1);
      expect(result.artItems[0].getMaterial()).toBe(ArtMaterial.Acrylic);

      await cleanup(tempPath);
    });
  });

  describe("Canvas formats", () => {
    test("handles canvas gallery format", async () => {
      const csvContent = `line number, quantity, tag number, Final medium, Outside Size Width, Outside Size Height, Glazing, Frame 1 Moulding, Hardware
1, 4, 1, Canvas - Gallery, 33, 43, N/A, N/A, N/A`;

      const tempPath = await createTempCsv(csvContent);
      const result = await parseWithDiagnostics(tempPath);

      expect(result.errors).toHaveLength(0);
      expect(result.artItems).toHaveLength(1);
      expect(result.artItems[0].getProductType()).toBe(ArtType.CanvasFloatFrame);
      expect(result.artItems[0].getMaterial()).toBe(ArtMaterial.CanvasGallery);

      await cleanup(tempPath);
    });

    test("handles canvas float frame format", async () => {
      const csvContent = `line number, quantity, tag number, Final medium, Outside Size Width, Outside Size Height, Glazing, Frame 1 Moulding, Hardware
1, 4, 1, Canvas - Float Frame, 33, 43, N/A, N/A, N/A`;

      const tempPath = await createTempCsv(csvContent);
      const result = await parseWithDiagnostics(tempPath);

      expect(result.errors).toHaveLength(0);
      expect(result.artItems).toHaveLength(1);
      expect(result.artItems[0].getProductType()).toBe(ArtType.CanvasFloatFrame);
      expect(result.artItems[0].getMaterial()).toBe(ArtMaterial.CanvasFramed);

      await cleanup(tempPath);
    });
  });

  describe("Acoustic panel formats", () => {
    test("handles acoustic panel format", async () => {
      const csvContent = `line number, quantity, tag number, Final medium, Outside Size Width, Outside Size Height, Glazing, Frame 1 Moulding, Hardware
1, 4, 1, Acoustic Panel, 33, 43, N/A, N/A, N/A`;

      const tempPath = await createTempCsv(csvContent);
      const result = await parseWithDiagnostics(tempPath);

      expect(result.errors).toHaveLength(0);
      expect(result.artItems).toHaveLength(1);
      expect(result.artItems[0].getProductType()).toBe(ArtType.AcousticPanel);

      await cleanup(tempPath);
    });
  });

  describe("Mixed mediums in single file", () => {
    test("handles canvas and paper print mixed", async () => {
      const csvContent = `line number, quantity, tag number, Final medium, Outside Size Width, Outside Size Height, Glazing, Frame 1 Moulding, Hardware
1, 3, 1, Canvas - Gallery, 33, 43, N/A, N/A, N/A
2, 2, 2, Paper Print - Framed, 33, 43, Regular Glass, N/A, N/A`;

      const tempPath = await createTempCsv(csvContent);
      const result = await parseWithDiagnostics(tempPath);

      expect(result.errors).toHaveLength(0);
      expect(result.artItems).toHaveLength(2);
      expect(result.artItems[0].getQuantity()).toBe(3);
      expect(result.artItems[0].getProductType()).toBe(ArtType.CanvasFloatFrame);
      expect(result.artItems[1].getQuantity()).toBe(2);
      expect(result.artItems[1].getProductType()).toBe(ArtType.PaperPrint);

      await cleanup(tempPath);
    });
  });

  describe("Varying dimensions", () => {
    test("handles standard size 36x36", async () => {
      const csvContent = `line number, quantity, tag number, Final medium, Outside Size Width, Outside Size Height, Glazing, Frame 1 Moulding, Hardware
1, 1, 1, Paper Print - Framed, 36, 36, Regular Glass, N/A, N/A`;

      const tempPath = await createTempCsv(csvContent);
      const result = await parseWithDiagnostics(tempPath);

      expect(result.errors).toHaveLength(0);
      expect(result.artItems).toHaveLength(1);

      const dims = result.artItems[0].getDimensions();
      expect(dims.length).toBe(36);
      expect(dims.width).toBe(36);

      await cleanup(tempPath);
    });

    test("handles large size 43x43", async () => {
      const csvContent = `line number, quantity, tag number, Final medium, Outside Size Width, Outside Size Height, Glazing, Frame 1 Moulding, Hardware
1, 1, 1, Paper Print - Framed, 43, 43, Regular Glass, N/A, N/A`;

      const tempPath = await createTempCsv(csvContent);
      const result = await parseWithDiagnostics(tempPath);

      expect(result.errors).toHaveLength(0);
      expect(result.artItems).toHaveLength(1);

      const dims = result.artItems[0].getDimensions();
      expect(dims.length).toBe(43);
      expect(dims.width).toBe(43);

      await cleanup(tempPath);
    });

    test("handles oversized 44x44", async () => {
      const csvContent = `line number, quantity, tag number, Final medium, Outside Size Width, Outside Size Height, Glazing, Frame 1 Moulding, Hardware
1, 1, 1, Paper Print - Framed, 44, 44, Regular Glass, N/A, N/A`;

      const tempPath = await createTempCsv(csvContent);
      const result = await parseWithDiagnostics(tempPath);

      expect(result.errors).toHaveLength(0);
      expect(result.artItems).toHaveLength(1);

      const dims = result.artItems[0].getDimensions();
      expect(dims.length).toBe(44);
      expect(dims.width).toBe(44);

      await cleanup(tempPath);
    });

    test("handles decimal dimensions 35.5x35.5", async () => {
      const csvContent = `line number, quantity, tag number, Final medium, Outside Size Width, Outside Size Height, Glazing, Frame 1 Moulding, Hardware
1, 1, 1, Paper Print - Framed, 35.5, 35.5, Regular Glass, N/A, N/A`;

      const tempPath = await createTempCsv(csvContent);
      const result = await parseWithDiagnostics(tempPath);

      expect(result.errors).toHaveLength(0);
      expect(result.artItems).toHaveLength(1);

      const dims = result.artItems[0].getDimensions();
      // 35.5 should round up to 36
      expect(dims.length).toBe(36);
      expect(dims.width).toBe(36);

      await cleanup(tempPath);
    });

    test("handles telescoping dimensions 83x35.5", async () => {
      const csvContent = `line number, quantity, tag number, Final medium, Outside Size Width, Outside Size Height, Glazing, Frame 1 Moulding, Hardware
1, 1, 1, Paper Print - Framed, 83, 35.5, Regular Glass, N/A, N/A`;

      const tempPath = await createTempCsv(csvContent);
      const result = await parseWithDiagnostics(tempPath);

      expect(result.errors).toHaveLength(0);
      expect(result.artItems).toHaveLength(1);

      const dims = result.artItems[0].getDimensions();
      expect(dims.length).toBe(83);
      expect(dims.width).toBe(36); // 35.5 rounds up

      await cleanup(tempPath);
    });

    test("handles extra large telescoping 83x43", async () => {
      const csvContent = `line number, quantity, tag number, Final medium, Outside Size Width, Outside Size Height, Glazing, Frame 1 Moulding, Hardware
1, 1, 1, Paper Print - Framed, 83, 43, Regular Glass, N/A, N/A`;

      const tempPath = await createTempCsv(csvContent);
      const result = await parseWithDiagnostics(tempPath);

      expect(result.errors).toHaveLength(0);
      expect(result.artItems).toHaveLength(1);

      const dims = result.artItems[0].getDimensions();
      expect(dims.length).toBe(83);
      expect(dims.width).toBe(43);

      await cleanup(tempPath);
    });
  });

  describe("Column spacing and formatting variations", () => {
    test("handles extra spaces in columns", async () => {
      const csvContent = `line number, quantity, tag number, Final medium, Outside Size Width, Outside Size Height, Glazing, Frame 1 Moulding, Hardware
1,  4,  1,  Paper Print - Framed,  33,  43,  Regular Glass,  N/A,  N/A`;

      const tempPath = await createTempCsv(csvContent);
      const result = await parseWithDiagnostics(tempPath);

      expect(result.errors).toHaveLength(0);
      expect(result.artItems).toHaveLength(1);

      await cleanup(tempPath);
    });

    test("handles no spaces after commas", async () => {
      const csvContent = `line number,quantity,tag number,Final medium,Outside Size Width,Outside Size Height,Glazing,Frame 1 Moulding,Hardware
1,4,1,Paper Print - Framed,33,43,Regular Glass,N/A,N/A`;

      const tempPath = await createTempCsv(csvContent);
      const result = await parseWithDiagnostics(tempPath);

      expect(result.errors).toHaveLength(0);
      expect(result.artItems).toHaveLength(1);

      await cleanup(tempPath);
    });

    test("handles case variations in medium names", async () => {
      const csvContent = `line number, quantity, tag number, Final medium, Outside Size Width, Outside Size Height, Glazing, Frame 1 Moulding, Hardware
1, 4, 1, PAPER PRINT - FRAMED, 33, 43, REGULAR GLASS, N/A, N/A`;

      const tempPath = await createTempCsv(csvContent);
      const result = await parseWithDiagnostics(tempPath);

      expect(result.errors).toHaveLength(0);
      expect(result.artItems).toHaveLength(1);
      expect(result.artItems[0].getProductType()).toBe(ArtType.PaperPrint);

      await cleanup(tempPath);
    });
  });

  describe("Alternative header formats", () => {
    test("handles tag number variation", async () => {
      const csvContent = `line number,quantity,tag number,final medium,outside size width,outside size height,glazing,frame 1 moulding,hardware
1,4,1,Paper Print - Framed,33,43,Regular glass,N/A,N/A`;

      const tempPath = await createTempCsv(csvContent);
      const result = await parseWithDiagnostics(tempPath);

      expect(result.errors).toHaveLength(0);
      expect(result.artItems).toHaveLength(1);

      await cleanup(tempPath);
    });
  });
});
