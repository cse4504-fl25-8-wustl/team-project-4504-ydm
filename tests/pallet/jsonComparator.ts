import type { JsonOutputSchema } from "../../app/formatters/JsonOutputSchema";

/**
 * Fields that are validated in the pallet packing test cases.
 */
export interface PalletTestExpectedOutput {
  total_pieces: number;
  standard_pallet_count: number;
  oversized_pallet_count: number;
  crate_count: number;
}

/**
 * Result of comparing actual output with expected output.
 */
export interface ComparisonResult {
  /** Whether the comparison passed */
  passed: boolean;
  /** List of differences found */
  differences: Array<{
    field: string;
    expected: number;
    actual: number;
  }>;
  /** Summary message describing the result */
  message: string;
}

/**
 * Compares the actual JSON output from JsonFormatter with the expected output.
 * Only validates the 4 relevant fields: total_pieces, standard_pallet_count, 
 * oversized_pallet_count, and crate_count.
 * 
 * @param actual - The actual JSON output from JsonFormatter
 * @param expected - The expected output from expected_output.json
 * @returns Comparison result with pass/fail status and details
 */
export function comparePalletOutput(
  actual: JsonOutputSchema,
  expected: PalletTestExpectedOutput
): ComparisonResult {
  const differences: Array<{ field: string; expected: number; actual: number }> = [];

  // Compare each field
  if (actual.total_pieces !== expected.total_pieces) {
    differences.push({
      field: "total_pieces",
      expected: expected.total_pieces,
      actual: actual.total_pieces,
    });
  }

  if (actual.standard_pallet_count !== expected.standard_pallet_count) {
    differences.push({
      field: "standard_pallet_count",
      expected: expected.standard_pallet_count,
      actual: actual.standard_pallet_count,
    });
  }

  if (actual.oversized_pallet_count !== expected.oversized_pallet_count) {
    differences.push({
      field: "oversized_pallet_count",
      expected: expected.oversized_pallet_count,
      actual: actual.oversized_pallet_count,
    });
  }

  if (actual.crate_count !== expected.crate_count) {
    differences.push({
      field: "crate_count",
      expected: expected.crate_count,
      actual: actual.crate_count,
    });
  }

  const passed = differences.length === 0;
  
  let message: string;
  if (passed) {
    message = "Output matches expected values";
  } else {
    const diffDescriptions = differences.map(
      diff => `  ${diff.field}: expected ${diff.expected}, got ${diff.actual}`
    ).join("\n");
    message = `Output differs from expected:\n${diffDescriptions}`;
  }

  return {
    passed,
    differences,
    message,
  };
}

/**
 * Formats a detailed diff message for test failure reporting.
 * 
 * @param actual - The actual JSON output
 * @param expected - The expected output
 * @param comparisonResult - The comparison result
 * @returns Formatted diff message
 */
export function formatDiffMessage(
  actual: JsonOutputSchema,
  expected: PalletTestExpectedOutput,
  comparisonResult: ComparisonResult
): string {
  if (comparisonResult.passed) {
    return "Output matches expected values";
  }

  const lines: string[] = [];
  lines.push("Expected vs Actual:");
  lines.push("");
  lines.push("Expected:");
  lines.push(`  total_pieces: ${expected.total_pieces}`);
  lines.push(`  standard_pallet_count: ${expected.standard_pallet_count}`);
  lines.push(`  oversized_pallet_count: ${expected.oversized_pallet_count}`);
  lines.push(`  crate_count: ${expected.crate_count}`);
  lines.push("");
  lines.push("Actual:");
  lines.push(`  total_pieces: ${actual.total_pieces}`);
  lines.push(`  standard_pallet_count: ${actual.standard_pallet_count}`);
  lines.push(`  oversized_pallet_count: ${actual.oversized_pallet_count}`);
  lines.push(`  crate_count: ${actual.crate_count}`);
  lines.push("");
  lines.push("Differences:");
  for (const diff of comparisonResult.differences) {
    lines.push(`  ${diff.field}: expected ${diff.expected}, got ${diff.actual}`);
  }

  return lines.join("\n");
}

