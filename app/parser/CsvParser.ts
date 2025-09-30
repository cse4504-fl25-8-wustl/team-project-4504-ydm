import { Art } from "../entities/Art";

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
  // TODO: adapt once Art exposes constructors/factories for real data mapping.
  void csvFilePath;
  return [new Art()];
}
