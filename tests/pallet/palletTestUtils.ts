import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Represents metadata for a single pallet packing test case.
 */
export interface PalletTestCase {
  /** Category: 'standard_pallet' or 'oversized_pallet' */
  category: string;
  /** Subcategory within the category (e.g., 'standard_box', 'large_box', 'mixed_boxes') */
  subcategory: string;
  /** Test case name (directory name) */
  name: string;
  /** Full path to the test case directory */
  testCasePath: string;
  /** Path to input.csv relative to project root */
  inputCsvPath: string;
  /** Path to expected_output.json relative to project root */
  expectedJsonPath: string;
  /** Full qualified test name for display */
  fullName: string;
}

/**
 * Discovers all pallet packing test cases in the test_data/pallet directory.
 * 
 * @param testDataRoot - Root directory containing pallet test cases (default: test_data/pallet)
 * @returns Array of test case metadata
 */
export async function discoverPalletTestCases(
  testDataRoot: string = join(__dirname, "../../test_data/pallet")
): Promise<PalletTestCase[]> {
  const testCases: PalletTestCase[] = [];

  try {
    // Read categories (standard_pallet, oversized_pallet)
    const categories = await readdir(testDataRoot);
    
    for (const category of categories) {
      const categoryPath = join(testDataRoot, category);
      const categoryStat = await stat(categoryPath);
      
      if (!categoryStat.isDirectory()) {
        continue;
      }

      // Read subcategories within each category
      const subcategories = await readdir(categoryPath);
      
      for (const subcategory of subcategories) {
        const subcategoryPath = join(categoryPath, subcategory);
        const subcategoryStat = await stat(subcategoryPath);
        
        if (!subcategoryStat.isDirectory()) {
          continue;
        }

        // Check if subcategory contains direct test cases or nested directories
        const subcategoryContents = await readdir(subcategoryPath);
        const hasDirectTestFiles = subcategoryContents.includes("input.csv") && 
                                   subcategoryContents.includes("expected_output.json");
        
        if (hasDirectTestFiles) {
          // Test case is directly in subcategory
          const testCase: PalletTestCase = {
            category,
            subcategory: "",
            name: subcategory,
            testCasePath: subcategoryPath,
            inputCsvPath: join("test_data/pallet", category, subcategory, "input.csv"),
            expectedJsonPath: join("test_data/pallet", category, subcategory, "expected_output.json"),
            fullName: `${category}/${subcategory}`,
          };
          testCases.push(testCase);
        } else {
          // Look for nested test case directories
          for (const item of subcategoryContents) {
            const itemPath = join(subcategoryPath, item);
            const itemStat = await stat(itemPath);
            
            if (itemStat.isDirectory()) {
              const testCaseContents = await readdir(itemPath);
              if (testCaseContents.includes("input.csv") && 
                  testCaseContents.includes("expected_output.json")) {
                const testCase: PalletTestCase = {
                  category,
                  subcategory,
                  name: item,
                  testCasePath: itemPath,
                  inputCsvPath: join("test_data/pallet", category, subcategory, item, "input.csv"),
                  expectedJsonPath: join("test_data/pallet", category, subcategory, item, "expected_output.json"),
                  fullName: `${category}/${subcategory}/${item}`,
                };
                testCases.push(testCase);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    throw new Error(`Failed to discover test cases: ${error instanceof Error ? error.message : String(error)}`);
  }

  return testCases.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

/**
 * Groups test cases by category for better organization in test reports.
 * 
 * @param testCases - Array of test cases to group
 * @returns Map of category to test cases
 */
export function groupTestCasesByCategory(
  testCases: PalletTestCase[]
): Map<string, PalletTestCase[]> {
  const grouped = new Map<string, PalletTestCase[]>();
  
  for (const testCase of testCases) {
    if (!grouped.has(testCase.category)) {
      grouped.set(testCase.category, []);
    }
    grouped.get(testCase.category)!.push(testCase);
  }
  
  return grouped;
}

