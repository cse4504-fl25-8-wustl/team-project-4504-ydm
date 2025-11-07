import type { PalletTestCase } from "./palletTestUtils";
import type { ComparisonResult } from "./jsonComparator";

/**
 * Result of running a single test case.
 */
export interface TestCaseResult {
  testCase: PalletTestCase;
  passed: boolean;
  error?: Error;
  comparisonResult?: ComparisonResult;
  duration?: number;
}

/**
 * Aggregated test results summary.
 */
export interface TestReport {
  /** Total number of test cases */
  totalTests: number;
  /** Number of passed tests */
  passedTests: number;
  /** Number of failed tests */
  failedTests: number;
  /** Pass rate as a percentage */
  passRate: number;
  /** Results grouped by category */
  resultsByCategory: Map<string, {
    total: number;
    passed: number;
    failed: number;
    testCases: TestCaseResult[];
  }>;
  /** All test case results */
  allResults: TestCaseResult[];
  /** List of failed test cases with details */
  failures: TestCaseResult[];
}

/**
 * Generates a test report from test case results.
 * 
 * @param results - Array of test case results
 * @param testCases - Original test cases (for grouping)
 * @returns Generated test report
 */
export function generateTestReport(
  results: TestCaseResult[],
  testCases: PalletTestCase[]
): TestReport {
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;
  const totalTests = results.length;
  const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  // Group results by category
  const resultsByCategory = new Map<string, {
    total: number;
    passed: number;
    failed: number;
    testCases: TestCaseResult[];
  }>();

  for (const result of results) {
    const category = result.testCase.category;
    if (!resultsByCategory.has(category)) {
      resultsByCategory.set(category, {
        total: 0,
        passed: 0,
        failed: 0,
        testCases: [],
      });
    }

    const categoryData = resultsByCategory.get(category)!;
    categoryData.total++;
    if (result.passed) {
      categoryData.passed++;
    } else {
      categoryData.failed++;
    }
    categoryData.testCases.push(result);
  }

  const failures = results.filter(r => !r.passed);

  return {
    totalTests,
    passedTests,
    failedTests,
    passRate,
    resultsByCategory,
    allResults: results,
    failures,
  };
}

/**
 * Formats a test report as a console-friendly string.
 * 
 * @param report - The test report to format
 * @returns Formatted report string
 */
export function formatConsoleReport(report: TestReport): string {
  const lines: string[] = [];
  
  lines.push("=".repeat(60));
  lines.push("Pallet Packing Test Report");
  lines.push("=".repeat(60));
  lines.push("");
  
  // Summary
  lines.push("Summary:");
  lines.push(`  Total Tests: ${report.totalTests}`);
  lines.push(`  Passed: ${report.passedTests}`);
  lines.push(`  Failed: ${report.failedTests}`);
  lines.push(`  Pass Rate: ${report.passRate.toFixed(2)}%`);
  lines.push("");
  
  // Results by category
  lines.push("Results by Category:");
  for (const [category, categoryData] of report.resultsByCategory.entries()) {
    lines.push(`  ${category}:`);
    lines.push(`    Total: ${categoryData.total}`);
    lines.push(`    Passed: ${categoryData.passed}`);
    lines.push(`    Failed: ${categoryData.failed}`);
    const categoryPassRate = categoryData.total > 0 
      ? (categoryData.passed / categoryData.total) * 100 
      : 0;
    lines.push(`    Pass Rate: ${categoryPassRate.toFixed(2)}%`);
  }
  lines.push("");
  
  // Failed tests details
  if (report.failures.length > 0) {
    lines.push("Failed Tests:");
    for (const failure of report.failures) {
      lines.push(`  - ${failure.testCase.fullName}`);
      if (failure.error) {
        lines.push(`    Error: ${failure.error.message}`);
      }
      if (failure.comparisonResult) {
        const diffs = failure.comparisonResult.differences;
        if (diffs.length > 0) {
          lines.push(`    Differences:`);
          for (const diff of diffs) {
            lines.push(`      ${diff.field}: expected ${diff.expected}, got ${diff.actual}`);
          }
        }
      }
    }
    lines.push("");
  }
  
  lines.push("=".repeat(60));
  
  return lines.join("\n");
}

/**
 * Exports a test report to JSON format.
 * 
 * @param report - The test report to export
 * @param pretty - Whether to format with indentation (default: true)
 * @returns JSON string
 */
export function exportJsonReport(report: TestReport, pretty: boolean = true): string {
  // Convert Map to object for JSON serialization
  const resultsByCategoryObj: Record<string, {
    total: number;
    passed: number;
    failed: number;
    testCases: Array<{
      testCase: {
        category: string;
        subcategory: string;
        name: string;
        fullName: string;
      };
      passed: boolean;
      error?: string;
      comparisonResult?: {
        passed: boolean;
        differences: Array<{
          field: string;
          expected: number;
          actual: number;
        }>;
      };
    }>;
  }> = {};

  for (const [category, categoryData] of report.resultsByCategory.entries()) {
    resultsByCategoryObj[category] = {
      total: categoryData.total,
      passed: categoryData.passed,
      failed: categoryData.failed,
      testCases: categoryData.testCases.map(tc => ({
        testCase: {
          category: tc.testCase.category,
          subcategory: tc.testCase.subcategory,
          name: tc.testCase.name,
          fullName: tc.testCase.fullName,
        },
        passed: tc.passed,
        error: tc.error?.message,
        comparisonResult: tc.comparisonResult ? {
          passed: tc.comparisonResult.passed,
          differences: tc.comparisonResult.differences,
        } : undefined,
      })),
    };
  }

  const reportObj = {
    summary: {
      totalTests: report.totalTests,
      passedTests: report.passedTests,
      failedTests: report.failedTests,
      passRate: report.passRate,
    },
    resultsByCategory: resultsByCategoryObj,
    failures: report.failures.map(f => ({
      testCase: f.testCase.fullName,
      error: f.error?.message,
      differences: f.comparisonResult?.differences,
    })),
  };

  if (pretty) {
    return JSON.stringify(reportObj, null, 2);
  }
  return JSON.stringify(reportObj);
}

