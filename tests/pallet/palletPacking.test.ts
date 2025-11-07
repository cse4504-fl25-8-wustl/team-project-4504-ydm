import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { discoverPalletTestCases, groupTestCasesByCategory, type PalletTestCase } from "./palletTestUtils";
import { comparePalletOutput, formatDiffMessage, type PalletTestExpectedOutput } from "./jsonComparator";
import { runPackagingJob } from "../../cli/main";
import { JsonFormatter } from "../../app/formatters/JsonFormatter";
import type { DeliveryCapabilities } from "../../app/requests/PackagingRequest";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Delivery capabilities for pallet packing tests.
 * All pallet tests assume pallets are accepted and crates are not.
 */
const PALLET_TEST_CAPABILITIES: DeliveryCapabilities = {
  acceptsPallets: true,
  acceptsCrates: false,
  hasLoadingDock: false,
  requiresLiftgate: false,
  needsInsideDelivery: false,
};

/**
 * Resolves a path relative to the project root.
 */
function resolveTestPath(relativePath: string): string {
  return resolve(__dirname, "../../", relativePath);
}

/**
 * Loads and parses the expected output JSON file.
 */
async function loadExpectedOutput(path: string): Promise<PalletTestExpectedOutput> {
  const content = await readFile(path, "utf-8");
  return JSON.parse(content) as PalletTestExpectedOutput;
}

/**
 * Runs a single pallet packing test case.
 */
async function runPalletTestCase(testCase: PalletTestCase): Promise<{
  passed: boolean;
  actual?: any;
  expected?: PalletTestExpectedOutput;
  comparisonResult?: ReturnType<typeof comparePalletOutput>;
  error?: Error;
}> {
  try {
    // Load expected output
    const expectedJsonPath = resolveTestPath(testCase.expectedJsonPath);
    const expected = await loadExpectedOutput(expectedJsonPath);

    // Resolve input CSV path
    const inputCsvPath = resolveTestPath(testCase.inputCsvPath);

    // Run packaging job
    const { response } = await runPackagingJob({
      csvFilePath: inputCsvPath,
      clientName: "Test Client",
      jobSiteLocation: "Test Location",
      serviceType: "Delivery",
      deliveryCapabilities: PALLET_TEST_CAPABILITIES,
      quiet: true,
    });

    // Convert to JSON output format
    const actual = JsonFormatter.toJsonOutput(response);

    // Compare with expected
    const comparisonResult = comparePalletOutput(actual, expected);

    return {
      passed: comparisonResult.passed,
      actual,
      expected,
      comparisonResult,
    };
  } catch (error) {
    return {
      passed: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// Discover all test cases at module load time using top-level await
const testCases: PalletTestCase[] = await discoverPalletTestCases();
const testCasesByCategory: Map<string, PalletTestCase[]> = groupTestCasesByCategory(testCases);

describe("Pallet Packing Tests", () => {
  // Dynamically create test groups for each category
  for (const [category, categoryTestCases] of testCasesByCategory.entries()) {
    describe(category, () => {
      // Dynamically create test cases for each test case in the category
      for (const testCase of categoryTestCases) {
        it(`should pass test case: ${testCase.fullName}`, async () => {
          const result = await runPalletTestCase(testCase);

          if (result.error) {
            throw new Error(
              `Test case failed with error: ${result.error.message}\n` +
              `Stack: ${result.error.stack}`
            );
          }

          if (!result.passed) {
            const diffMessage = formatDiffMessage(
              result.actual!,
              result.expected!,
              result.comparisonResult!
            );
            throw new Error(
              `Test case '${testCase.fullName}' failed:\n${diffMessage}`
            );
          }

          // If we get here, the test passed
          expect(result.passed).toBe(true);
        });
      }
    });
  }

  // Summary test that validates we discovered test cases
  it("should discover test cases", () => {
    expect(testCases.length).toBeGreaterThan(0);
    
    // Log summary
    console.log(`\nDiscovered ${testCases.length} pallet packing test cases:`);
    for (const [category, categoryTestCases] of testCasesByCategory.entries()) {
      console.log(`  ${category}: ${categoryTestCases.length} test cases`);
    }
  });
});

