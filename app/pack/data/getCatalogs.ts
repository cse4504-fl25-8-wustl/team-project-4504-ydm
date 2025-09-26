export interface BoxType {
  id: "standard" | "large" | "ups-small" | "ups-large";
  name: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  weight: number;
  maxCapacity: {
    standardPallet: number;
    oversizePallet?: number;
  };
  usageRules: string[];
  shippingMethod: "pallet" | "ups" | "both";
}

export interface PalletType {
  id: "standard" | "glass-small" | "oversize";
  name: string;
  dimensions: {
    length: number;
    width: number;
  };
  weight: number;
  maxBoxCapacity: number;
  usageRules: string[];
}

export interface CrateType {
  id: "standard" | "custom";
  name: string;
  baseDimensions: {
    length: number;
    width: number;
  };
  weight: number;
  heightCalculation: string;
  usageRules: string[];
}

export interface CatalogData {
  boxes: BoxType[];
  pallets: PalletType[];
  crates: CrateType[];
}

const BOXES: BoxType[] = [
  {
    id: "standard",
    name: "Standard Box",
    dimensions: { length: 37, width: 11, height: 31 },
    weight: 2,
    maxCapacity: { standardPallet: 4, oversizePallet: 5 },
    usageRules: ["Default framed artwork box"],
    shippingMethod: "pallet",
  },
  {
    id: "large",
    name: "Large Box",
    dimensions: { length: 44, width: 13, height: 48 },
    weight: 3,
    maxCapacity: { standardPallet: 3, oversizePallet: 4 },
    usageRules: ["Use when any dimension exceeds 36 inches"],
    shippingMethod: "pallet",
  },
  {
    id: "ups-small",
    name: "UPS Small",
    dimensions: { length: 36, width: 6, height: 36 },
    weight: 1,
    maxCapacity: { standardPallet: 0 },
    usageRules: ["Parcel shipments only"],
    shippingMethod: "ups",
  },
  {
    id: "ups-large",
    name: "UPS Large",
    dimensions: { length: 44, width: 6, height: 35 },
    weight: 1.5,
    maxCapacity: { standardPallet: 0 },
    usageRules: ["Parcel shipments only"],
    shippingMethod: "ups",
  },
];

const PALLETS: PalletType[] = [
  {
    id: "standard",
    name: "Standard Pallet",
    dimensions: { length: 48, width: 40 },
    weight: 60,
    maxBoxCapacity: 4,
    usageRules: ["Default pallet size"],
  },
  {
    id: "glass-small",
    name: "Glass Small Pallet",
    dimensions: { length: 43, width: 35 },
    weight: 60,
    maxBoxCapacity: 2,
    usageRules: ["Two glass boxes to minimize movement"],
  },
  {
    id: "oversize",
    name: "Oversize Pallet",
    dimensions: { length: 60, width: 40 },
    weight: 75,
    maxBoxCapacity: 5,
    usageRules: ["Large boxes or overflow"],
  },
];

const CRATES: CrateType[] = [
  {
    id: "standard",
    name: "Standard Crate",
    baseDimensions: { length: 50, width: 38 },
    weight: 125,
    heightCalculation: "largest_dimension + 8",
    usageRules: ["Default crate"],
  },
  {
    id: "custom",
    name: "Custom Crate",
    baseDimensions: { length: 0, width: 0 },
    weight: 150,
    heightCalculation: "custom",
    usageRules: ["Oversize crate"],
  },
];

export default function getCatalogs(): CatalogData {
  return {
    boxes: BOXES,
    pallets: PALLETS,
    crates: CRATES,
  };
}
