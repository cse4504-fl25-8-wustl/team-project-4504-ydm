import { Box } from "./Box";

/**
 * Crate (or pallet) groups boxes for shipment. Implementation requirements:
 * - Track contained boxes and expose read-only snapshots via getContents.
 * - Enforce capacity rules (max boxes, height/weight thresholds) within canAccommodate/isAtCapacity.
 * - calculateWeight should sum each box weight plus crate/pallet overhead supplied via parameter.
 * - Future enhancements may differentiate between crate vs pallet handling; keep data model flexible.
 */
export class Crate {
  private readonly contents: Box[] = [];

  public canAccommodate(box: Box): boolean {
    return false;
  }

  public addBox(box: Box): boolean {
    this.contents.push(box);
    return false;
  }

  public getContents(): Box[] {
    return [...this.contents];
  }

  public isAtCapacity(): boolean {
    return false;
  }

  public getRemainingCapacity(): number {
    return 0;
  }

  public calculateWeight(overhead: number): number {
    return 0;
  }
}
