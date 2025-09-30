import { Art } from "./Art";

/**
 * Box encapsulates capacity tracking for a single shipping box. Implementers must:
 * - Store added Art items and enforce product-type limits (rule A) before accepting them.
 * - Reject art whose dimensions exceed standard box limits (rule B) and flag special handling (rule C).
 * - Provide isAtCapacity and getRemainingCapacity so interactors know whether to create new boxes.
 * - Aggregate total weight by summing contained Art weights for crate-level calculations.
 * The dummy return values below should be replaced with real rule checks; interactor tests will
 * confirm the box either accepts or rejects an Art instance based on these rules.
 */
export class Box {
  private readonly contents: Art[] = [];

  public canAccommodate(art: Art): boolean {
    // Business rule A.i-A.ii: enforce product-specific capacity limits before accepting art.
    // Business rule B: reject art pieces exceeding 44 inches that require custom packaging.
    return false;
  }

  public addArt(art: Art): boolean {
    // Business rule C: flag tactile panels and raised float mounts for special handling.
    this.contents.push(art);
    return false;
  }

  public getContents(): Art[] {
    return [...this.contents];
  }

  public isAtCapacity(): boolean {
    return false;
  }

  public getRemainingCapacity(): number {
    return 0;
  }

  public getTotalWeight(): number {
    // Supports crate weight calculation by exposing aggregate box weight (Step 8 requirement).
    return 0;
  }
}
