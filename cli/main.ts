import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PackagingService } from "../app/services/PackagingService";
import type { DeliveryCapabilities } from "../app/requests/PackagingRequest";
import { TextFormatter } from "../app/formatters/TextFormatter";

// Re-export for backward compatibility with tests
export { PackagingService };
export type { PackagingJobOptions, PackagingJobResult } from "../app/services/PackagingService";

/**
 * Wrapper for backward compatibility with existing tests.
 * @deprecated Use PackagingService.runPackagingJob directly
 */
export const runPackagingJob = PackagingService.runPackagingJob;

/**
 * Wrapper for backward compatibility with existing tests.
 * @deprecated Use PackagingService.parseBoolean directly
 */
export const parseBoolean = PackagingService.parseBoolean;

export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  // Check for optional --json-output flag
  let jsonOutputPath: string | undefined;
  const jsonOutputIndex = args.findIndex(arg => arg === "--json-output" || arg === "-j");
  if (jsonOutputIndex !== -1 && jsonOutputIndex + 1 < args.length) {
    jsonOutputPath = args[jsonOutputIndex + 1];
    // Remove the flag and its value from args
    args.splice(jsonOutputIndex, 2);
  }

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
  ] = args;

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
      "Usage: pnpm package <csv-file-path> <client-name> <job-site-location> <service-type> <accepts-pallets> <accepts-crates> <has-loading-dock> <requires-liftgate> <needs-inside-delivery> [--json-output <output-file>]",
    );
    process.exit(1);
  }

  let deliveryCapabilities;

  try {
    // Convert the human-friendly flags into booleans for the request payload.
    deliveryCapabilities = {
      acceptsPallets: PackagingService.parseBoolean(acceptsPalletsRaw, "accepts-pallets"),
      acceptsCrates: PackagingService.parseBoolean(acceptsCratesRaw, "accepts-crates"),
      hasLoadingDock: PackagingService.parseBoolean(hasLoadingDockRaw, "has-loading-dock"),
      requiresLiftgate: PackagingService.parseBoolean(requiresLiftgateRaw, "requires-liftgate"),
      needsInsideDelivery: PackagingService.parseBoolean(needsInsideDeliveryRaw, "needs-inside-delivery"),
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
    const { response } = await PackagingService.runPackagingJob({
      csvFilePath,
      clientName,
      jobSiteLocation,
      serviceType,
      deliveryCapabilities,
      jsonOutputPath,
    });

    // Output in human-readable text format as specified by client
    console.log(TextFormatter.formatResponse(response));
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
