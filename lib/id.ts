/**
 * Temporary ID generator stub.
 * Student 3's richer implementation will replace this in the integrated branch.
 */

let counters: Record<string, number> = {
  item: 0,
  box: 0,
  crate: 0,
  pallet: 0,
};

function nextId(prefix: keyof typeof counters): string {
  counters[prefix] += 1;
  return `${prefix.toUpperCase()}-${counters[prefix].toString().padStart(4, "0")}`;
}

export const IdGenerator = {
  generateItemId(): string {
    return nextId("item");
  },
  generateBoxId(): string {
    return nextId("box");
  },
  generateCrateId(): string {
    return nextId("crate");
  },
  generatePalletId(): string {
    return nextId("pallet");
  },
};

export default IdGenerator;
