export const GOLDEN_SUMMARIES = {
  input1: {
    workOrder: {
      totalPieces: 13,
      standardPieces: 11,
      oversizedPieces: 2,
      oversizedBreakdown: [
        { size: "55x31", quantity: 1, weightLbs: 17 },
        { size: "47x34", quantity: 1, weightLbs: 16 },
      ],
    },
    weights: {
      artwork: 187,
      packaging: 60,
      shipment: 247,
    },
    packaging: {
      boxCounts: [{ label: "Standard box", count: 3 }],
      containerCounts: [{ label: "Standard pallet", count: 1 }],
    },
  },
  input2: {
    workOrder: {
      totalPieces: 55,
      standardPieces: 49,
      oversizedPieces: 6,
      oversizedBreakdown: [
        { size: "46x34", quantity: 2, weightLbs: 32 },
        { size: "56x32", quantity: 1, weightLbs: 18 },
        { size: "48x32", quantity: 3, weightLbs: 48 },
      ],
    },
    weights: {
      artwork: 784,
      packaging: 150,
      shipment: 934,
    },
    packaging: {
      boxCounts: [{ label: "Standard box", count: 10 }],
      containerCounts: [{ label: "Oversize pallet", count: 2 }],
    },
  },
  input3: {
    workOrder: {
      totalPieces: 70,
      standardPieces: 70,
    },
    weights: {
      artwork: 1120,
      packaging: 180,
      shipment: 1300,
    },
    packaging: {
      boxCounts: [{ label: "Standard box", count: 12 }],
      containerCounts: [{ label: "Standard pallet", count: 3 }],
    },
  },
  input4: {
    workOrder: {
      totalPieces: 18,
      standardPieces: 18,
    },
    weights: {
      artwork: 234,
      packaging: 60,
      shipment: 294,
    },
    packaging: {
      boxCounts: [{ label: "Standard box", count: 3 }],
      containerCounts: [{ label: "Standard pallet", count: 1 }],
    },
  },
} as const;
