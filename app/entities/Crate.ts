import { Box, BoxType } from "./Box";

export enum CrateType {
  StandardCrate,
  StandardPallet,
  GlassPallet,
  OversizePallet,
}

export enum ContainerKind {
  Crate,
  Pallet,
}

const CRATE_TYPE_LABELS: Record<CrateType, string> = {
  [CrateType.StandardCrate]: "STANDARD_CRATE",
  [CrateType.StandardPallet]: "STANDARD_PALLET",
  [CrateType.GlassPallet]: "GLASS_PALLET",
  [CrateType.OversizePallet]: "OVERSIZE_PALLET",
};

export function getCrateTypeLabel(type: CrateType): string {
  return CRATE_TYPE_LABELS[type];
}

interface CrateSpecification {
  type: CrateType;
  containerKind: ContainerKind;
  tareWeight: number;
  maxBoxes: number;
  allowedBoxTypes?: readonly BoxType[];
  notes?: string;
}

const MAX_STACK_HEIGHT_IN = 84;

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
    notes: "60x40 pallet; holds up to five standard or mixed oversized boxes.",
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

    if (this.contents.length >= this.spec.maxBoxes) {
      return false;
    }

    const projectedHeight = this.getStackHeight() + box.getRequiredDimensions().height;
    if (projectedHeight > MAX_STACK_HEIGHT_IN) {
      return false;
    }

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
    return this.contents.length >= this.spec.maxBoxes;
  }

  public getRemainingCapacity(): number {
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

  private getStackHeight(): number {
    return this.contents.reduce((sum, current) => sum + current.getRequiredDimensions().height, 0);
  }
}
