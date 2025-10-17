import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runPackagingJob } from "../../cli/main";
import { GOLDEN_SUMMARIES } from "./expected";
import type { DeliveryCapabilities } from "../../app/requests/PackagingRequest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SITE_CAPABILITIES: DeliveryCapabilities = {
  acceptsPallets: true,
  acceptsCrates: false,
  hasLoadingDock: false,
  requiresLiftgate: false,
  needsInsideDelivery: false,
};

interface CaseConfig {
  name: keyof typeof GOLDEN_SUMMARIES;
  csv: string;
}

const CASES: CaseConfig[] = [
  { name: "input1", csv: "input1_test.csv" },
  { name: "input2", csv: "input2_test.csv" },
  { name: "input3", csv: "input3_test.csv" },
  { name: "input4", csv: "input4_test.csv" },
];

function resolveFixture(relativePath: string): string {
  // CSVs live two levels up from this test file (project root)
  return path.resolve(__dirname, "..", "..", relativePath);
}

function sumArtQuantity(response: Awaited<ReturnType<typeof runPackagingJob>>["response"]): number {
  return response.packingSummary.hardware.lineItemSummary.reduce(
    (sum, entry) => sum + entry.artQuantity,
    0,
  );
}

function getCount(items: Array<{ label: string; count: number }>, label: string): number {
  return items.find((item) => item.label === label)?.count ?? 0;
}

describe("End-to-end packaging workflow", () => {
  it.each(CASES)("produces expected summary for %s", async ({ name, csv }) => {
    const expected = GOLDEN_SUMMARIES[name];
    const csvPath = resolveFixture(csv);

    const { response } = await runPackagingJob({
      csvFilePath: csvPath,
      clientName: "Client",
      jobSiteLocation: "Test Location",
      serviceType: "Delivery + Installation",
      deliveryCapabilities: SITE_CAPABILITIES,
      quiet: true,
    });

    // Work order totals
    const totalPieces = sumArtQuantity(response);
    expect(totalPieces).toBe(expected.workOrder.totalPieces);

    // Weight summaries
    expect(response.weightSummary.totalArtworkWeightLbs).toBe(expected.weights.artwork);
    expect(response.weightSummary.packagingWeightLbs.total).toBe(expected.weights.packaging);
    expect(response.weightSummary.finalShipmentWeightLbs).toBe(expected.weights.shipment);

    // Box counts
    for (const boxExpectation of expected.packaging.boxCounts) {
      const actual = getCount(response.packingSummary.boxRequirements, boxExpectation.label);
      expect(actual).toBe(boxExpectation.count);
    }

    // Container counts
    for (const containerExpectation of expected.packaging.containerCounts) {
      const actual = getCount(response.packingSummary.containerRequirements, containerExpectation.label);
      expect(actual).toBe(containerExpectation.count);
    }
  });
});
