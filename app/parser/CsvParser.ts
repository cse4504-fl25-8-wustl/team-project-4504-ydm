import { Art } from "../entities/Art";

/**
 * Shallow placeholder for CSV ingestion. Responsible for transforming raw CSV input
 * into domain Art objects without leaking parsing details beyond the main program.
 */
export async function parse(csvFilePath: string): Promise<Art[]> {
  // TODO: adapt once Art exposes constructors/factories for real data mapping.
  void csvFilePath;
  return [new Art()];
}
