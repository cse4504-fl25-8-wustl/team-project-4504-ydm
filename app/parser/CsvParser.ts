import { readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import csvParse from "csv-parser";
import { Art } from "../entities/Art";

export interface ParseResult {
  artItems: Art[];
  errors: ParseError[];
  totalRows: number;
  validRows: number;
}

export interface ParseError {
  row: number;
  error: string;
  data?: Record<string, string>;
}

/**
 * parse is responsible for transforming a CSV file into Art domain entities.
 * Implementation checklist:
 * - Read the CSV at csvFilePath (UTF-8). Fail fast with a descriptive error if the file
 *   cannot be accessed.
 * - Parse each row using a robust CSV library (handle quoted values and escaped commas).
 * - Validate required columns (e.g., SKU, product type, dimensions, weight, handling flags).
 * - Map rows into Art instances by calling the appropriate constructor/factory once entities
 *   expose them. Invalid rows should either be skipped with logging or raise an error,
 *   depending on project policy.
 * - Consider returning both Art[] and a diagnostics object if partial failures must be
 *   reported upstream. For the initial milestone, returning Art[] is sufficient.
 */
export async function parse(csvFilePath: string): Promise<Art[]> {
  const result = await parseWithDiagnostics(csvFilePath);
  
  // For backward compatibility, return just the art items
  // Log errors to stderr for visibility
  if (result.errors.length > 0) {
    console.error(`CSV parsing completed with ${result.errors.length} errors:`);
    result.errors.forEach(error => {
      console.error(`  Row ${error.row}: ${error.error}`);
    });
  }
  
  return result.artItems;
}

/**
 * Enhanced parse function that returns detailed diagnostics
 */
export async function parseWithDiagnostics(csvFilePath: string): Promise<ParseResult> {
  const artItems: Art[] = [];
  const errors: ParseError[] = [];
  let totalRows = 0;
  let validRows = 0;

  try {
    // Check if file exists and is readable
    await readFile(csvFilePath, 'utf8');
  } catch (error) {
    throw new Error(`Cannot access CSV file '${csvFilePath}': ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return new Promise((resolve, reject) => {
    const stream = createReadStream(csvFilePath, { encoding: 'utf8' });
    
    stream
      .pipe(csvParse({
        mapHeaders: ({ header }) => header.trim().replace(/"/g, ''), // Clean headers
      }))
      .on('data', (row: Record<string, string>) => {
        totalRows++;
        
        try {
          // Validate required columns exist - check for case variations
          const requiredColumns = ['sku', 'productType', 'glazingType', 'length', 'width', 'height', 'weight'];
          const rowKeys = Object.keys(row);
          const missingColumns = requiredColumns.filter(col => 
            !rowKeys.some(key => key.toLowerCase() === col.toLowerCase())
          );
          
          if (missingColumns.length > 0) {
            errors.push({
              row: totalRows,
              error: `Missing required columns: ${missingColumns.join(', ')}. Available columns: ${rowKeys.join(', ')}`,
              data: row
            });
            return;
          }

          // Create Art instance from row data
          const art = Art.fromCsvRow(row);
          artItems.push(art);
          validRows++;
          
        } catch (error) {
          errors.push({
            row: totalRows,
            error: error instanceof Error ? error.message : 'Unknown parsing error',
            data: row
          });
        }
      })
      .on('end', () => {
        resolve({
          artItems,
          errors,
          totalRows,
          validRows
        });
      })
      .on('error', (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      });
  });
}

/**
 * Validates CSV file structure and returns column information
 */
export async function validateCsvStructure(csvFilePath: string): Promise<{
  headers: string[];
  isValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let headers: string[] = [];

  try {
    const firstLine = await readFile(csvFilePath, 'utf8').then(content => content.split('\n')[0]);
    headers = firstLine.split(',').map(h => h.trim().replace(/"/g, ''));
    
    const requiredColumns = ['sku', 'productType', 'glazingType', 'length', 'width', 'height', 'weight'];
    const missingColumns = requiredColumns.filter(col => 
      !headers.some(h => h.toLowerCase() === col.toLowerCase())
    );
    
    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
    }
    
  } catch (error) {
    errors.push(`Cannot read CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    headers,
    isValid: errors.length === 0,
    errors
  };
}
