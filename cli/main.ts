import process from "node:process";

import { parse } from "../app/parser/CsvParser";
import { PackagingInteractor } from "../app/interactors/PackagingInteractor";
import type { PackagingRequest } from "../app/requests/PackagingRequest";

/**
 * Entry point for the command-line workflow. Implementers must:
 * 1. Read the CSV file path and site metadata flags from argv (already parsed below).
 * 2. Delegate CSV parsing to app/parser/CsvParser.parse without duplicating parsing logic here.
 * 3. Translate parsed rows into real Art entities once the parser supplies full data.
 * 4. Construct a PackagingRequest that mirrors the schema in app/requests.
 * 5. Invoke PackagingInteractor.packageEverything and print the PackagingResponse as JSON.
 *    The current JSON.stringify call is the required output format.
 * 6. Surface user-facing errors (bad arguments, missing files, parse failures) via stderr
 *    and exit with a non-zero status. The success path must exit with code 0.
 * Extending arguments (e.g., accepting defaults from config) should happen above the
 * PackagingRequest construction while keeping the rest of the flow intact.
 */
/**
 * Normalizes human-friendly boolean strings (yes/no, true/false, etc.) into actual booleans.
 */
function parseBoolean(value: string, label: string): boolean {
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

async function main(): Promise<void> {
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

  // Placeholder CSV parsing hook; currently returns dummy Art entities.
  const artItems = await parse(csvFilePath);

  const request: PackagingRequest = {
    artItems,
    clientName,
    jobSiteLocation,
    serviceType,
    deliveryCapabilities,
  };

  const interactor = new PackagingInteractor();
  const response = interactor.packageEverything(request);

  console.log(JSON.stringify(response, null, 2));
}

main().catch((error) => {
  console.error("Failed to run packaging workflow:", error);
  process.exit(1);
});
