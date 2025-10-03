import { Box, BoxType } from "./Box";

export enum CrateType {
  StandardCrate = "STANDARD_CRATE",
  StandardPallet = "STANDARD_PALLET",
  GlassPallet = "GLASS_PALLET",
  OversizePallet = "OVERSIZE_PALLET",
}

export enum ContainerKind {
  Crate = "CRATE",
  Pallet = "PALLET",
}

interface CrateSpecification {
  type: CrateType;
  containerKind: ContainerKind;
  tareWeight: number;
  maxBoxes?: number;
  allowedBoxTypes?: readonly BoxType[];
  notes?: string;
}

const CRATE_SPECIFICATIONS: Record<CrateType, CrateSpecification> = {
  [CrateType.StandardCrate]: {
    type: CrateType.StandardCrate,
    containerKind: ContainerKind.Crate,
    tareWeight: 125,
    maxBoxes: 3,
    notes: "Most protective option; can also accept loose items per Bri's rules.",
  },
  [CrateType.StandardPallet]: {
    type: CrateType.StandardPallet,
    containerKind: ContainerKind.Pallet,
    tareWeight: 60,
    maxBoxes: 4,
    allowedBoxTypes: [BoxType.Standard],
    notes: "48x40 pallet with four standard boxes (rule of thumb).",
  },
  [CrateType.GlassPallet]: {
    type: CrateType.GlassPallet,
    containerKind: ContainerKind.Pallet,
    tareWeight: 60,
    maxBoxes: 4,
    allowedBoxTypes: [BoxType.Standard],
    notes: "43x35 glass pallet; use for small glass shipments (rule may vary).",
  },
  [CrateType.OversizePallet]: {
    type: CrateType.OversizePallet,
    containerKind: ContainerKind.Pallet,
    tareWeight: 75,
    maxBoxes: 5,
    allowedBoxTypes: [BoxType.Standard, BoxType.Large],
    notes: "60x40 pallet; holds five standard boxes or a mix with oversized boxes.",
  },
};

export interface CrateOptions {
  type?: CrateType;
}

export class Crate {
  private readonly spec: CrateSpecification;
  private readonly contents: Box[] = [];
  private totalWeight: number;

  constructor(options: CrateOptions = {}) {
    const type = options.type ?? CrateType.StandardCrate;
    this.spec = CRATE_SPECIFICATIONS[type];
    this.totalWeight = this.spec.tareWeight;
  }

  public getType(): CrateType {
    return this.spec.type;
  }

  public getContainerKind(): ContainerKind {
    return this.spec.containerKind;
  }

  public getSpecification(): CrateSpecification {
    return this.spec;
  }

  public getContents(): Box[] {
    return [...this.contents];
  }

  public canAccommodate(box: Box): boolean {
    if (this.spec.allowedBoxTypes && !this.spec.allowedBoxTypes.includes(box.getType())) {
      return false;
    }

    if (this.spec.maxBoxes !== undefined && this.contents.length >= this.spec.maxBoxes) {
      return false;
    }

    // TODO: enforce combined height/weight limits once confirmed by business.
    return true;
  }

  public addBox(box: Box): boolean {
    if (!this.canAccommodate(box)) {
      return false;
    }

    this.contents.push(box);
    this.totalWeight += box.getTotalWeight();
    return true;
  }

  public isAtCapacity(): boolean {
    if (this.spec.maxBoxes === undefined) {
      return false;
    }

    return this.contents.length >= this.spec.maxBoxes;
  }

  public getRemainingCapacity(): number {
    if (this.spec.maxBoxes === undefined) {
      return Number.POSITIVE_INFINITY;
    }

    return Math.max(0, this.spec.maxBoxes - this.contents.length);
  }

  public calculateWeight(overhead: number): number {
    return Math.ceil(this.totalWeight + overhead);
  }

  public getTotalWeight(): number {
    return Math.ceil(this.totalWeight);
  }

  public getTareWeight(): number {
    return this.spec.tareWeight;
  }
}
