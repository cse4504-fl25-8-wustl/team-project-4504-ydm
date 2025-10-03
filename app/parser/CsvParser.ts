import { Art, ArtMaterial, ArtType } from "../entities/Art";

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
  // TODO: replace the placeholder Art instance with parsed data from the CSV file.
  void csvFilePath;
  return [
    new Art({
      id: "placeholder-art",
      productType: ArtType.FramedPrint,
      material: ArtMaterial.Glass,
      dimensions: { length: 30, width: 24, height: 4 },
      quantity: 1,
    }),
  ];
}
