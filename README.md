## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

absolutely 👍 let’s make it **pretty** and **specific** for each student. you can drop this straight into your README.

---

# 🗂 Project Structure

```
src/
├─ app/
│  └─ api/
│     └─ pack/
│        └─ route.ts                # [Student 2]  API endpoint (POST /api/pack)
│
├─ app/pack/                        # Feature: Packing Planner (logic + rules)
│  ├─ actions.ts                    # [Student 2]  Server entry (alt to API)
│  │
│  ├─ data/                         # Server-only data helpers
│  │  └─ getCatalogs.ts             # [Student 3]  Provide box/pallet/crate catalogs
│  │
│  ├─ domain/                       # Pure domain logic
│  │  ├─ entities/                  # [Student 1]  Core business entities
│  │  │  ├─ Item.ts                 # Item entity
│  │  │  ├─ Box.ts                  # BoxType + PackedBox
│  │  │  ├─ Container.ts            # PalletType + CrateType + PackedContainer
│  │  │  └─ Output.ts               # ShipmentTotals + PackingResult
│  │  │
│  │  ├─ dto/                       # [Student 2]  Input/Output DTOs
│  │  │  ├─ PackInputDTO.ts         # Request shape (JSON)
│  │  │  └─ PackOutputDTO.ts        # Response shape (JSON)
│  │  │
│  │  ├─ engine.ts                  # [Student 1]  Packing algorithms
│  │  ├─ cost.ts                    # [Student 2]  Cost calculation per ARCH rules
│  │  └─ validate.ts                # [Student 2]  Zod schemas & unit normalization
│  │
│  └─ rules/                        # [Student 1]  ARCH Design Business Rules
│     ├─ archRules.ts               # Policy interface
│     └─ profiles/
│        ├─ standard.ts             # Default ARCH profile
│        └─ fragileFirst.ts         # Alternate profile example
│
├─ lib/
│  ├─ units.ts                      # [Student 3]  Unit converters (lb↔kg, in↔cm)
│  └─ id.ts                         # [Student 3]  ID generation utilities
│
│
└─ scripts/
   └─ run-pack.mjs                  # [Student 2]  CLI script to run packing offline
```

---

# 👩‍💻 Responsibilities

### 🎓 Student 1 – **Domain & Packing Logic**

**Tasks**

* Define **entities**: Item, Box, Container, Output.
* Implement **packing algorithms**:

  * `packItemsToBoxes()` → group items into boxes.
  * `packBoxesToContainers()` → group boxes into crates/pallets.
* Implement **ARCH rules policies** (standard + fragile-first).
* Ensure all outputs are computed:

  1. Item weights
  2. Items → Boxes (with box weights)
  3. Boxes → Containers (with container weights & heights)
  4. Total shipment weight

---

### 🎓 Student 2 – **Validation, Costs & Orchestration**

**Tasks**

* Define **DTOs** (input + output shapes).
* Validate and normalize input using **Zod** (`validate.ts`).
* Compute **costs** per ARCH rules (`cost.ts`).
* Implement orchestration:

  * `actions.ts` (server action)
  * `route.ts` (API endpoint, POST /api/pack)
  * `run-pack.mjs` (CLI runner for JSON input)
* Return complete `PackOutputDTO` with items, boxes, containers, totals, and cost.

---

### 🎓 Student 3 – **Data, Helpers & Infrastructure**

**Tasks**

* Provide **catalog data** (box/pallet/crate definitions).
* Build shared **utility functions**:

  * `units.ts` (lb↔kg, in↔cm converters)
  * `id.ts` (ID generation)