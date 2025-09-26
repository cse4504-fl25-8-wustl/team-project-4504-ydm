import { Art } from "./Art";

export class Box {
  public canAccommodate(art: Art): boolean {
    // Business rule A.i-A.ii: enforce product-specific capacity limits before accepting art.
    // Business rule B: reject art pieces exceeding 44 inches that require custom packaging.
    return false;
  }

  public addArt(art: Art): boolean {
    // Business rule C: flag tactile panels and raised float mounts for special handling.
    return false;
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
