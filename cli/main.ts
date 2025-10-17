import process from "node:process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse, validateCsvStructure } from "../app/parser/CsvParser";
import { PackagingInteractor } from "../app/interactors/PackagingInteractor";
import type { PackagingRequest, DeliveryCapabilities } from "../app/requests/PackagingRequest";
import type { PackagingResponse } from "../app/responses/PackagingResponse";

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
}

export interface PackagingJobResult {
  response: PackagingResponse;
  artItemCount: number;
}

/**
 * Normalizes human-friendly boolean strings (yes/no, true/false, etc.) into actual booleans.
 */
export function parseBoolean(value: string, label: string): boolean {
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

/**
 * Shared implementation used by both the CLI entry point and automated tests.
 * Loads art items from CSV, runs the packaging workflow, and returns the response.
 */
export async function runPackagingJob(options: PackagingJobOptions): Promise<PackagingJobResult> {
  const {
    csvFilePath,
    clientName,
    jobSiteLocation,
    serviceType,
    deliveryCapabilities,
    quiet = false,
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

  return {
    response,
    artItemCount: artItems.length,
  };
}

export async function main(): Promise<void> {
  const [
    csvFilePath,
    clientName,
    jobSiteLocation,
    serviceType,
    acceptsPalletsRaw,
    acceptsCratesRaw,
    hasLoadingDockRaw,
    requiresLiftgateRaw,
    needsInsideDeliveryRaw,
  ] = process.argv.slice(2);

  // Basic usage guard to ensure all required arguments are provided.
  if (
    !csvFilePath ||
    !clientName ||
    !jobSiteLocation ||
    !serviceType ||
    !acceptsPalletsRaw ||
    !acceptsCratesRaw ||
    !hasLoadingDockRaw ||
    !requiresLiftgateRaw ||
    !needsInsideDeliveryRaw
  ) {
    console.error(
      "Usage: pnpm package <csv-file-path> <client-name> <job-site-location> <service-type> <accepts-pallets> <accepts-crates> <has-loading-dock> <requires-liftgate> <needs-inside-delivery>",
    );
    process.exit(1);
  }

  let deliveryCapabilities;

  try {
    // Convert the human-friendly flags into booleans for the request payload.
    deliveryCapabilities = {
      acceptsPallets: parseBoolean(acceptsPalletsRaw, "accepts-pallets"),
      acceptsCrates: parseBoolean(acceptsCratesRaw, "accepts-crates"),
      hasLoadingDock: parseBoolean(hasLoadingDockRaw, "has-loading-dock"),
      requiresLiftgate: parseBoolean(requiresLiftgateRaw, "requires-liftgate"),
      needsInsideDelivery: parseBoolean(needsInsideDeliveryRaw, "needs-inside-delivery"),
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error("Invalid capability flag.");
    }
    process.exit(1);
  }

  try {
    const { response } = await runPackagingJob({
      csvFilePath,
      clientName,
      jobSiteLocation,
      serviceType,
      deliveryCapabilities,
    });

    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }
}

const moduleFilename = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === moduleFilename) {
  main().catch((error) => {
    console.error("Failed to run packaging workflow:", error);
    process.exit(1);
  });
}
