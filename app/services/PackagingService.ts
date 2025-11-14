import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { parse, validateCsvStructure } from "../parser/CsvParser";
import { PackagingInteractor } from "../interactors/PackagingInteractor";
import type { PackagingRequest, DeliveryCapabilities } from "../requests/PackagingRequest";
import type { PackagingResponse } from "../responses/PackagingResponse";
import { JsonFormatter } from "../formatters/JsonFormatter";

export interface PackagingJobOptions {
  csvFilePath: string;
  clientName: string;
  jobSiteLocation: string;
  serviceType: string;
  deliveryCapabilities: DeliveryCapabilities;
  /**
   * When true, suppresses non-critical log output (useful for automated tests).
   */
  quiet?: boolean;
  /**
   * Optional path to write JSON output file.
   */
  jsonOutputPath?: string;
}

export interface PackagingJobResult {
  response: PackagingResponse;
  artItemCount: number;
  totalPieceCount: number;
}

/**
 * Shared service for packaging operations.
 * Used by both CLI and GUI to avoid code duplication.
 */
export class PackagingService {
  /**
   * Loads art items from CSV, runs the packaging workflow, and returns the response.
   */
  static async runPackagingJob(options: PackagingJobOptions): Promise<PackagingJobResult> {
    const {
      csvFilePath,
      clientName,
      jobSiteLocation,
      serviceType,
      deliveryCapabilities,
      quiet = false,
      jsonOutputPath,
    } = options;

    if (!existsSync(csvFilePath)) {
      throw new Error(`CSV file '${csvFilePath}' does not exist.`);
    }

    const structureValidation = await validateCsvStructure(csvFilePath);
    if (!structureValidation.isValid) {
      const errorMessages = structureValidation.errors.join("\n");
      throw new Error(`CSV file validation failed:\n${errorMessages}`);
    }

    const artItems = await parse(csvFilePath);
    if (artItems.length === 0) {
      throw new Error("No valid art items found in CSV file.");
    }

    if (!quiet) {
      console.error(`Successfully parsed ${artItems.length} art items from CSV.`);
    }

    const request: PackagingRequest = {
      artItems,
      clientName,
      jobSiteLocation,
      serviceType,
      deliveryCapabilities,
    };

    const interactor = new PackagingInteractor();
    const response = interactor.packageEverything(request);

    // Calculate total piece count by summing quantities from all art items
    const totalPieceCount = artItems.reduce((sum, art) => sum + art.getQuantity(), 0);

    // Write JSON output if path is specified
    if (jsonOutputPath) {
      const jsonOutput = JsonFormatter.toJsonOutput(response);
      const jsonString = JsonFormatter.stringify(jsonOutput);
      await writeFile(jsonOutputPath, jsonString, "utf-8");
      if (!quiet) {
        console.error(`JSON output written to: ${jsonOutputPath}`);
      }
    }

    return {
      response,
      artItemCount: artItems.length,
      totalPieceCount,
    };
  }

  /**
   * Normalizes human-friendly boolean strings (yes/no, true/false, etc.) into actual booleans.
   */
  static parseBoolean(value: string, label: string): boolean {
    const normalized = value.trim().toLowerCase();

    if (["y", "yes", "true", "1"].includes(normalized)) {
      return true;
    }

    if (["n", "no", "false", "0"].includes(normalized)) {
      return false;
    }

    throw new Error(
      `Invalid ${label} value: "${value}". Accepted values: yes/no, true/false, y/n, 1/0.`,
    );
  }
}
