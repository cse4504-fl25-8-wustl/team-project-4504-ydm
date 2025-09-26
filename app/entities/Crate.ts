import { Box } from "./Box";

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
