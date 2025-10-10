import { Art, ArtType } from "./Art";

export enum BoxType {
  Standard = "STANDARD",
  Large = "LARGE",
  UpsSmall = "UPS_SMALL",
  UpsLarge = "UPS_LARGE",
}

interface BoxSpecification {
  type: BoxType;
  innerLength: number;
  innerWidth: number;
  innerHeight: number;
  tareWeight: number;
  notes?: string;
}

const BOX_SPECIFICATIONS: Record<BoxType, BoxSpecification> = {
  [BoxType.Standard]: {
    type: BoxType.Standard,
    innerLength: 36,
    innerWidth: 36,
    innerHeight: 11,
    tareWeight: 0, // TODO: confirm the actual tare weight for standard boxes.
    notes: "Most common size; telescope up to 84 inches on the long edge when one side ≤36 inches.",
  },
  [BoxType.Large]: {
    type: BoxType.Large,
    innerLength: 44,
    innerWidth: 44,
    innerHeight: 13,
    tareWeight: 0, // TODO: capture the actual tare weight for large boxes.
    notes: ">36 inches in both directions; intended for oversized pieces up to ~43.5 inches.",
  },
  [BoxType.UpsSmall]: {
    type: BoxType.UpsSmall,
    innerLength: 36,
    innerWidth: 36,
    innerHeight: 6,
    tareWeight: 0,
    notes: "UPS parcel only; not suitable for fragile glazing (rule 15).",
  },
  [BoxType.UpsLarge]: {
    type: BoxType.UpsLarge,
    innerLength: 44,
    innerWidth: 35,
    innerHeight: 6,
    tareWeight: 0,
    notes: "Adjustable-length UPS carton; keep for durable acrylic shipments (rule 15).",
  },
};

const DEFAULT_CANVAS_PIECES_PER_BOX = 6; // TODO: validate vs written instruction that cites 4 pieces per box.

interface BoxRules {
  maxPiecesPerProduct: Partial<Record<ArtType, number>>;
  maxOversizedPieces: number;
  disallowedProductTypes: Set<ArtType>;
}

const DEFAULT_BOX_RULES: BoxRules = {
  maxPiecesPerProduct: {
    [ArtType.PaperPrint]: 6,
    [ArtType.PaperPrintWithTitlePlate]: 6,
    [ArtType.CanvasFloatFrame]: DEFAULT_CANVAS_PIECES_PER_BOX,
    [ArtType.AcousticPanel]: 4,
    [ArtType.AcousticPanelFramed]: 4,
    [ArtType.MetalPrint]: 6,
    [ArtType.Mirror]: 0, // Mirrors are crate-only per packing guidance.
    [ArtType.WallDecor]: 6,
  },
  maxOversizedPieces: 3,
  disallowedProductTypes: new Set([ArtType.Mirror]),
};

export interface BoxOptions {
  type?: BoxType;
  maxPiecesPerProductOverride?: Partial<Record<ArtType, number>>;
  maxOversizedPiecesOverride?: number;
  disallowedProductTypesOverride?: ArtType[];
}

export class Box {
  private readonly spec: BoxSpecification;
  private readonly rules: BoxRules;
  private readonly contents: Art[] = [];
  private readonly counts = new Map<ArtType, number>();
  private totalPieces = 0;
  private oversizedPieces = 0;
  private totalWeight: number;
  private readonly nominalCapacity: number;
  private requiredLength: number;
  private requiredWidth: number;
  private requiredHeight: number;

  constructor(options: BoxOptions = {}) {
    const type = options.type ?? BoxType.Standard;
    this.spec = BOX_SPECIFICATIONS[type];

    const mergedMaxPieces: Partial<Record<ArtType, number>> = {
      ...DEFAULT_BOX_RULES.maxPiecesPerProduct,
      ...options.maxPiecesPerProductOverride,
    };

    const disallowed = new Set(DEFAULT_BOX_RULES.disallowedProductTypes);
    for (const override of options.disallowedProductTypesOverride ?? []) {
      disallowed.add(override);
    }

    this.rules = {
      maxPiecesPerProduct: mergedMaxPieces,
      maxOversizedPieces: options.maxOversizedPiecesOverride ?? DEFAULT_BOX_RULES.maxOversizedPieces,
      disallowedProductTypes: disallowed,
    };

    const finiteLimits = Object.values(mergedMaxPieces)
      .filter((limit): limit is number => typeof limit === "number" && Number.isFinite(limit));
    if (finiteLimits.length > 0) {
      this.nominalCapacity = Math.max(this.rules.maxOversizedPieces, ...finiteLimits);
    } else {
      this.nominalCapacity = this.rules.maxOversizedPieces;
    }

    this.totalWeight = this.spec.tareWeight;
    this.requiredLength = this.spec.innerLength;
    this.requiredWidth = this.spec.innerWidth;
    this.requiredHeight = this.spec.innerHeight;
  }

  public getType(): BoxType {
    return this.spec.type;
  }

  public getSpecification(): BoxSpecification {
    return this.spec;
  }

  public getContents(): Art[] {
    return [...this.contents];
  }

  public getTotalPieces(): number {
    return this.totalPieces;
  }

  public getOversizedPieces(): number {
    return this.oversizedPieces;
  }

  public canAccommodate(art: Art): boolean {
    if (this.rules.disallowedProductTypes.has(art.getProductType())) {
      return false;
    }

    if (art.requiresCrateOnly()) {
      return false;
    }

    if (art.needsCustomPackaging()) {
      return false;
    }

    if (!this.fitsDimensions(art)) {
      return false;
    }

    const type = art.getProductType();
    const currentCount = this.counts.get(type) ?? 0;
    const limit = this.rules.maxPiecesPerProduct[type];

    if (limit !== undefined && currentCount + 1 > limit) {
      return false;
    }

    if (art.isOversized()) {
      if (this.oversizedPieces + 1 > this.rules.maxOversizedPieces) {
        return false;
      }
    }

    if (Number.isFinite(this.nominalCapacity) && this.totalPieces + 1 > this.nominalCapacity) {
      return false;
    }

    return true;
  }

  public addArt(art: Art): boolean {
    if (!this.canAccommodate(art)) {
      return false;
    }

    this.contents.push(art);

    const type = art.getProductType();
    const updatedCount = (this.counts.get(type) ?? 0) + 1;
    this.counts.set(type, updatedCount);

    this.totalPieces += 1;

    if (art.isOversized()) {
      this.oversizedPieces += 1;
    }

    this.totalWeight += art.getWeight();

    const dims = art.getDimensions();
    const footprint = art.getPlanarFootprint();
    this.requiredLength = Math.max(this.requiredLength, footprint.longSide);
    this.requiredWidth = Math.max(this.requiredWidth, footprint.shortSide);
    this.requiredHeight = Math.max(this.requiredHeight, dims.height);
    return true;
  }

  public isAtCapacity(): boolean {
    if (!Number.isFinite(this.nominalCapacity)) {
      return false;
    }

    return this.totalPieces >= this.nominalCapacity;
  }

  public getRemainingCapacity(): number {
    if (!Number.isFinite(this.nominalCapacity)) {
      return Number.POSITIVE_INFINITY;
    }

    return Math.max(0, this.nominalCapacity - this.totalPieces);
  }

  public getTotalWeight(): number {
    return Math.ceil(this.totalWeight);
  }

  public getNominalCapacity(): number {
    return this.nominalCapacity;
  }

  public getRequiredDimensions(): { length: number; width: number; height: number } {
    return {
      length: this.requiredLength,
      width: this.requiredWidth,
      height: this.requiredHeight,
    };
  }

  public getTelescopingLength(): number | null {
    if (this.spec.type !== BoxType.Standard) {
      return null;
    }

    return this.requiredLength > this.spec.innerLength ? this.requiredLength : null;
  }

  public getFootprint(): { length: number; width: number; height: number } {
    return {
      length: this.spec.innerLength,
      width: this.spec.innerWidth,
      height: this.spec.innerHeight,
    };
  }

  private fitsDimensions(art: Art): boolean {
    const { PackagingRules } = require("../rules/PackagingRules");
    const depth = art.getDepth();

    switch (this.spec.type) {
      case BoxType.Standard: {
        if (!PackagingRules.fitsInStandardBox(art)) {
          return false;
        }
        return depth <= this.spec.innerHeight;
      }

      case BoxType.Large: {
        if (!PackagingRules.fitsInLargeBox(art)) {
          return false;
        }
        return depth <= this.spec.innerHeight;
      }

      case BoxType.UpsSmall:
      case BoxType.UpsLarge: {
        return PackagingRules.fitsInUpsBox(art, this.spec.innerLength, this.spec.innerWidth, this.spec.innerHeight);
      }

      default:
        return true;
    }
  }
}
