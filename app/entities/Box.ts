import { Art, ArtType } from "./Art";
import { PackagingRules } from "../rules/PackagingRules";
import { WeightCalculator } from "../calculations/WeightCalculator";

export enum BoxType {
  Standard,
  Large,
  UpsSmall,
  UpsLarge,
}

const BOX_TYPE_LABELS: Record<BoxType, string> = {
  [BoxType.Standard]: "STANDARD",
  [BoxType.Large]: "LARGE",
  [BoxType.UpsSmall]: "UPS_SMALL",
  [BoxType.UpsLarge]: "UPS_LARGE",
};

export function getBoxTypeLabel(type: BoxType): string {
  return BOX_TYPE_LABELS[type];
}

interface BoxSpecification {
  type: BoxType;
  innerLength: number;
  innerWidth: number;
  innerHeight: number;
  tareWeight: number;
  maxShortSideInches: number;
  maxLongSideInches: number;
  telescopeMaxLengthInches?: number;
  notes?: string;
}

const BOX_SPECIFICATIONS: Record<BoxType, BoxSpecification> = {
  [BoxType.Standard]: {
    type: BoxType.Standard,
    innerLength: 36,
    innerWidth: 36,
    innerHeight: 11,
    tareWeight: 18,
    maxShortSideInches: 36,
    maxLongSideInches: 84,
    telescopeMaxLengthInches: 84,
    notes: "Most common size; telescope up to 84 inches on the long edge when one side ≤36 inches.",
  },
  [BoxType.Large]: {
    type: BoxType.Large,
    innerLength: 44,
    innerWidth: 44,
    innerHeight: 13,
    tareWeight: 22,
    maxShortSideInches: 43.5,
    maxLongSideInches: 43.5,
    notes: ">36 inches in both directions; intended for oversized pieces up to ~43.5 inches.",
  },
  [BoxType.UpsSmall]: {
    type: BoxType.UpsSmall,
    innerLength: 36,
    innerWidth: 36,
    innerHeight: 6,
    tareWeight: 8,
    maxShortSideInches: 36,
    maxLongSideInches: 36,
    notes: "UPS parcel only; not suitable for fragile glazing (rule 15).",
  },
  [BoxType.UpsLarge]: {
    type: BoxType.UpsLarge,
    innerLength: 44,
    innerWidth: 35,
    innerHeight: 6,
    tareWeight: 10,
    maxShortSideInches: 35,
    maxLongSideInches: 44,
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
    [ArtType.PatientBoard]: 2,
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
    this.nominalCapacity = finiteLimits.length > 0
      ? Math.max(this.rules.maxOversizedPieces, ...finiteLimits)
      : this.rules.maxOversizedPieces;

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

    if (PackagingRules.requiresCrateOnly(art)) {
      return false;
    }

    if (PackagingRules.needsCustomPackaging(art)) {
      return false;
    }

    if (!this.fitsDimensions(art)) {
      return false;
    }

    const quantity = art.getQuantity();
    const type = art.getProductType();
    const currentCount = this.counts.get(type) ?? 0;
    const limit = this.rules.maxPiecesPerProduct[type];

    if (limit !== undefined && currentCount + quantity > limit) {
      return false;
    }

    // Only apply oversized piece limit if item requires oversize box (both dimensions >36")
    // Items with one dimension ≤36" fit in standard boxes and use regular capacity limits
    // Note: If product has a specific limit (e.g., PaperPrint = 6), use that instead of oversized limit
    // The oversized limit (3) only applies to products without specific limits
    if (PackagingRules.requiresOversizeBox(art)) {
      const productLimit = this.rules.maxPiecesPerProduct[type];
      const oversizedLimit = this.rules.maxOversizedPieces;
      
      // If product has a specific limit that's higher than oversized limit, use product limit
      // Otherwise, use the more restrictive limit (oversized limit)
      if (productLimit !== undefined && productLimit >= oversizedLimit) {
        // Product limit is higher or equal to oversized limit - don't check oversized limit
        // The product limit check above (line 197-199) is sufficient
        // This allows PaperPrint to fit 6 pieces even in oversized boxes
      } else {
        // No product-specific limit or product limit is lower - use oversized limit
        if (this.oversizedPieces + quantity > oversizedLimit) {
          return false;
        }
      }
    }

    if (Number.isFinite(this.nominalCapacity) && this.totalPieces + quantity > this.nominalCapacity) {
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
    const quantity = art.getQuantity();
    const updatedCount = (this.counts.get(type) ?? 0) + quantity;
    this.counts.set(type, updatedCount);

    this.totalPieces += quantity;

    // Only count as oversized if it requires oversize box (both dimensions >36")
    if (PackagingRules.requiresOversizeBox(art)) {
      this.oversizedPieces += quantity;
    }

    this.totalWeight += WeightCalculator.calculateWeight(art);

    const dims = art.getDimensions();
    const footprint = PackagingRules.getPlanarFootprint(art);
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

    return this.requiredLength > (this.spec.telescopeMaxLengthInches ?? this.spec.innerLength)
      ? this.requiredLength
      : null;
  }

  public getFootprint(): { length: number; width: number; height: number } {
    return {
      length: this.spec.innerLength,
      width: this.spec.innerWidth,
      height: this.spec.innerHeight,
    };
  }

  private fitsDimensions(art: Art): boolean {
    const footprint = PackagingRules.getPlanarFootprint(art);
    const depth = art.getDepth();

    switch (this.spec.type) {
      case BoxType.Standard: {
        if (footprint.shortSide > this.spec.maxShortSideInches) {
          return false;
        }

        if (footprint.longSide > (this.spec.telescopeMaxLengthInches ?? this.spec.maxLongSideInches)) {
          return false;
        }

        return depth <= this.spec.innerHeight;
      }

      case BoxType.Large: {
        if (footprint.longSide > this.spec.maxLongSideInches || footprint.shortSide > this.spec.maxShortSideInches) {
          return false;
        }

        return depth <= this.spec.innerHeight;
      }

      case BoxType.UpsSmall:
      case BoxType.UpsLarge: {
        const boxPlanar = [this.spec.innerLength, this.spec.innerWidth].sort((a, b) => b - a);
        const artPlanar = [footprint.longSide, footprint.shortSide].sort((a, b) => b - a);

        if (artPlanar[0] > boxPlanar[0]) {
          return false;
        }

        if (artPlanar[1] > boxPlanar[1]) {
          return false;
        }

        if (depth > this.spec.innerHeight) {
          return false;
        }

        return true;
      }

      default:
        return true;
    }
  }
}
