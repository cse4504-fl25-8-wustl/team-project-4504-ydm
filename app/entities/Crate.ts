import { Box } from "./Box";

export class Crate {
  public canAccommodate(box: Box): boolean {
    return false;
  }

  public addBox(box: Box): boolean {
    return false;
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
