import { MaterialType, MATERIAL_WEIGHTS, PackInputDTO } from "./dto/PackInputDTO";

export function determineMaterialType(finalMedium: string, glazing?: string): MaterialType {
  const medium = finalMedium.toLowerCase();

  if (medium.includes("mirror")) {
    return "MIRROR";
  }
  if (medium.includes("acoustic")) {
    return medium.includes("framed") ? "ACOUSTIC-PANEL-FRAMED" : "ACOUSTIC-PANEL";
  }
  if (medium.includes("patient board")) {
    return "PATIENT-BOARD";
  }
  if (medium.includes("canvas")) {
    return medium.includes("gallery") ? "CANVAS-GALLERY" : "CANVAS-FRAMED";
  }

  if (glazing) {
    const glazingLower = glazing.toLowerCase();
    if (glazingLower.includes("acrylic")) {
      return "ACRYLIC";
    }
    if (glazingLower.includes("glass")) {
      return "GLASS";
    }
  }

  if (medium.includes("framed") && glazing) {
    return "GLASS";
  }

  return "CANVAS-FRAMED";
}

export function validatePackInput(input: PackInputDTO): PackInputDTO {
  return input;
}
