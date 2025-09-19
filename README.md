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
├─ app/                          # Next.js App Router (routes & UI)
│  └─ pack/                      # Feature: Packing Planner
│     ├─ page.tsx                # Student 3 – Page layout (Server Component)
│     ├─ actions.ts              # Student 2 – Server actions (wires engine + cost)
│     ├─ loading.tsx             # (optional) route-level skeleton
│     ├─ error.tsx               # (optional) route-level error UI
│     │
│     ├─ components/             # UI for this feature
│     │  ├─ InputForm.tsx        # Student 3 – "use client" form (calls actions.ts)
│     │  └─ PlanView.tsx         # Student 3 – Display results (items, boxes, containers)
│     │
│     ├─ data/                   # Server-only data helpers
│     │  ├─ getCatalogs.ts       # Student 2 – Provide box/pallet/crate catalogs
│     │  ├─ getPlan.ts           # Student 2 – Fetch saved plan (optional)
│     │  └─ savePlan.ts          # Student 2 – Persist plan (optional)
│     │
│     ├─ domain/                 # Pure domain logic (no framework code)
│     │  ├─ entities/            # Student 1 – Core business entities
│     │  │  ├─ Item.ts           # Item entity
│     │  │  ├─ Box.ts            # BoxType + PackedBox
│     │  │  ├─ Container.ts      # PalletType + CrateType + PackedContainer
│     │  │  └─ Output.ts         # ShipmentTotals + PackingResult
│     │  │
│     │  ├─ dto/                 # Student 2 – Input/Output DTOs
│     │  │  ├─ PackInputDTO.ts   # Request object (form/client payload)
│     │  │  └─ PackOutputDTO.ts  # Response object (server → UI)
│     │  │
│     │  ├─ engine.ts            # Student 1 – Packing algorithms
│     │  ├─ cost.ts              # Student 2 – Cost calculation per ARCH rules
│     │  └─ validate.ts          # Student 2 – zod schemas & unit normalization
│     │
│     └─ rules/                  # ARCH Design Business Rules (policy)
│        ├─ archRules.ts         # Student 1 – Policy interface
│        └─ profiles/
│           ├─ standard.ts       # Student 1 – Default ARCH profile
│           └─ fragileFirst.ts   # Student 1 – Alternative profile example
│
├─ components/                   # Shared UI using shadcn/ui
│  └─ ui/
│     ├─ Table.tsx               # Student 3 – Display tabular data
│     └─ Badge.tsx               # Student 3 – Status badges
│
├─ lib/                          # Shared helpers/tools
│  ├─ units.ts                   # Student 2 – Converters (lb↔kg, in↔cm)
│  └─ id.ts                      # Student 2 – ID generation
│--------------------------------------------------------------------------------- # do this part later
├─ server/                       # Server-only utilities (no React)
│  ├─ db.ts                      # Student 2 – DB client (if persistence added)
│  └─ env.ts                     # Student 2 – zod-validated env loader
│
└─ middleware.ts                 # (optional) global middleware
```

---

# Responsibilities

### Student 1 – **Domain & Packing Logic**

* Define entities and types: `Item`, `BoxType`, `PalletType`, `CrateType`, `PackedBox`, `PackedContainer`.
* Implement packing algorithms:

  * `packItemsToBoxes()` → groups items into boxes.
  * `packBoxesToContainers()` → groups boxes into crates/pallets.
* Maintain rules engine (`archRules.ts` + `profiles/*`).
* Ensure outputs include:

  * Item weights
  * Items → Boxes (with box weights)
  * Boxes → Containers (with container weights & heights)

---

### Student 2 – **Validation, Data & Costs**

* Validate inputs with Zod (`validate.ts`).
* Normalize units (`lib/units.ts`).
* Provide catalogs (`data/getCatalogs.ts`).
* Implement cost calculation (`domain/cost.ts`) based on ARCH rules.
* Wire everything in `actions.ts`:

  * Validate input
  * Run Student 1’s engine
  * Compute totals & costs
  * Return structured output
* (Optional) persistence: `getPlan.ts`, `savePlan.ts`, DB client

---

### Student 3 – **UI & Presentation**

* Build form (`InputForm.tsx`) to submit items.
* Build results view (`PlanView.tsx`) to show:

  * Item weights
  * Box groupings & weights
  * Container groupings, weights & heights
  * Total shipment weight
* Create clean tables and badges using shared UI (`components/ui/*`).
* Assemble page layout (`page.tsx`) with form + results.