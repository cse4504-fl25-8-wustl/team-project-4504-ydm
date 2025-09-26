import type { CrateType, PalletType } from "../../pack/data/getCatalogs";
import type { PackedBox } from "./Box";

export type ContainerKind = "pallet" | "crate";

export type PalletCategory = "standard" | "glass-small" | "oversize";
export type CrateCategory = "standard" | "custom";

export interface ContainerDimensions {
  length: number;
  width: number;
  height: number;
}

export interface PackedContainerBase {
  id: string;
  kind: ContainerKind;
  dimensions: ContainerDimensions;
  tareWeight: number;
  boxes: PackedBox[];
  contentWeight: number;
  totalWeight: number;
  warnings: string[];
}

export interface PackedPallet extends PackedContainerBase {
  kind: "pallet";
  palletProfile: PalletType;
  category: PalletCategory;
}

export interface PackedCrate extends PackedContainerBase {
  kind: "crate";
  crateProfile: CrateType;
  category: CrateCategory;
}

export type PackedContainer = PackedPallet | PackedCrate;
