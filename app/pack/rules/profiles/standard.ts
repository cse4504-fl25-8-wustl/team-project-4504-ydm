import { MaterialType } from "../../domain/dto/PackInputDTO";
import { BoxAllocationType } from "../../domain/entities/Box";
import { ManualHandlingInfo, ProcessedItem } from "../../domain/entities/Item";
import { PalletCategory } from "../../domain/entities/Container";
import { CrateCapacityResult, OversizeClass, PackingRuleProfile, RuleContext } from "../archRules";

const CANVAS_WARNING = "Canvas packing uses Excel rule (6 per box) pending confirmation.";

function isSunriseClient(context: RuleContext): boolean {
  return context.clientName.toLowerCase().includes("sunrise");
}

function buildManualHandlingInfo(item: ProcessedItem): ManualHandlingInfo {
  const { width, height } = item.dimensions;
  if (width >= 36.5 && height >= 36.5) {
    return {
      required: true,
      reason: "Square oversize requires manual plan",
      recommendedAction: "Review crate or custom pallet requirements manually."
    };
  }

  if (width > 44 || height > 44) {
    return {
      required: true,
      reason: "Exceeds 44\" crate threshold",
      recommendedAction: "Coordinate with Craters & Freighters for custom packaging."
    };
  }

  return { required: false };
}

function resolvePiecesPerBox(material: MaterialType, context: RuleContext): number {
  switch (material) {
    case "GLASS":
    case "ACRYLIC":
      return isSunriseClient(context) ? 8 : 6;
    case "CANVAS-FRAMED":
    case "CANVAS-GALLERY":
      return 6; // Known discrepancy documented in CANVAS_WARNING.
    case "MIRROR":
      return 1; // Mirrors prefer crates; keep box capacity conservative.
    case "ACOUSTIC-PANEL":
    case "ACOUSTIC-PANEL-FRAMED":
      return 4;
    case "PATIENT-BOARD":
      return 2;
    default:
      return 4;
  }
}

function resolveCrateCapacity(material: MaterialType, oversize: OversizeClass): CrateCapacityResult | null {
  switch (material) {
    case "GLASS":
    case "ACRYLIC":
      return oversize === "standard"
        ? { piecesPerCrate: 25 }
        : { piecesPerCrate: 18 };
    case "CANVAS-FRAMED":
    case "CANVAS-GALLERY":
      return oversize === "standard"
        ? { piecesPerCrate: 18 }
        : { piecesPerCrate: 12 };
    case "MIRROR":
      return { piecesPerCrate: 24, notes: "Mirrors load directly into crates" };
    default:
      return null;
  }
}

function resolveBoxAllocation(item: ProcessedItem): BoxAllocationType {
  return item.flags.requiresLargeBox ? "large" : "standard";
}

function shouldRouteBoxesToCrate(context: RuleContext): boolean {
  if (!context.deliveryCapabilities.acceptsCrates) {
    return false;
  }
  if (isSunriseClient(context)) {
    return false;
  }
  return true;
}

function determinePalletCategory(boxType: BoxAllocationType, containsGlass: boolean): PalletCategory {
  if (containsGlass) {
    return "glass-small";
  }
  if (boxType === "large") {
    return "oversize";
  }
  return "standard";
}

export const STANDARD_PROFILE: PackingRuleProfile = {
  id: "standard",
  label: "ARCH Standard Packing Profile",
  getDefaultDepthInches: () => 4,
  getPiecesPerBox: resolvePiecesPerBox,
  evaluateManualHandling: buildManualHandlingInfo,
  resolveBoxAllocation,
  resolveCrateCapacity,
  shouldRouteBoxesToCrate,
  determinePalletCategory,
  getRuleWarnings: () => [CANVAS_WARNING],
};

export default STANDARD_PROFILE;
