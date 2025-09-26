# Student 1 Implementation - Domain Packing Logic

## Overview
This document captures the scope, assumptions, and integration contract for the Student 1 domain layer. It should be read together with the Student 2 and Student 3 implementation notes to understand how the full packing calculator fits together.

## Implementation Summary
- Domain entities live under `app/pack/domain/entities` and model processed items, packed boxes, and packed containers.
- The packing rule profile (`app/pack/rules/profiles/standard.ts`) centralises all business heuristics (glass pallet policy, crate capacities, canvas warning, etc.).
- `app/pack/domain/engine.ts` exposes `buildPackingPlan`, producing a `PackingPlan` plus manual-handling flags and warnings.
- `app/pack/domain/planAdapter.ts` converts the domain plan into the DTO-compatible structures Student 2 expects without mutating their orchestrator yet.
- Temporary DTO/catalog scaffolding (`app/pack/domain/dto/*`, `app/pack/data/getCatalogs.ts`) and a lightweight `lib/id.ts` exist purely so this branch compiles in isolation; they should be replaced with the authoritative Student 2/3 versions when merged.

## Responsibilities
- Model the core domain entities used during packing (items, boxes, containers, packing plans).
- Encode Bri's business rules for sizing, packing, and client-specific constraints.
- Produce a deterministic packing plan that downstream layers (Student 2 orchestration, Student 3 utilities) can consume for cost calculations and exports.
- Surface items that cannot be processed automatically and tag them for manual handling while still returning results for the remainder of the shipment.

## Key Assumptions (2025-09-12)
These assumptions are temporary and will likely evolve after stakeholder review. They are documented in code comments where they are applied.

1. **Glass Pallet Strategy**: All boxes containing glass glazing are loaded onto `glass-small` pallets (capacity 2 boxes). If an odd number of boxes remains, a single-box pallet is allowed with empty space. This keeps the logic simple to change later.
2. **Oversize Pallet Trigger**: Whenever a shipment contains large boxes or when standard pallets run out of capacity for remaining boxes, the engine switches to an `oversize` pallet profile. No weight threshold is currently enforced; this will be revisited once ARCH supplies more granular rules.
3. **Manual Handling Items**:
   - Items with both dimensions ≥ 36.5" square are flagged for manual review (`reason: "Square oversize requires manual plan"`).
   - Items with any dimension > 44" are flagged as `requiresManualHandling` with `reason: "Exceeds 44\" crate threshold"`.
   The engine keeps processing all other items and returns a detailed list of manual-handling entries for downstream reporting.
4. **Crate Workflow**: Items are packed into boxes first, then grouped into crates according to the material-specific crate capacity chart supplied by Student 3. This mirrors the instruction that crates hold boxed artwork.
5. **Depth Estimation**: A default depth of 4" is used for all items to estimate stacked heights. Pallet heights add an additional 8" per business rule.
6. **Canvas Rule Conflict**: We follow the Excel calculator guidance (6 pieces per box → 12 per standard pallet) and log a warning string to highlight the known discrepancy.
7. **Height Guidelines**: Heights > 84" generate a warning; heights > 102" force the engine to split boxes across additional pallets to stay within LTL limits.

## Integration Points
- The packing engine exports `buildPackingPlan(input: PackInputDTO, catalogs?: CatalogData): PackingEngineResult` from `app/pack/domain/engine.ts`.
- Student 2 will replace the current inline packing logic in `app/pack/actions.ts` with a call to `buildPackingPlan`, then map the returned domain objects to the existing DTO output before running cost calculations.
- The engine relies on Student 3 utilities (`getCatalogs`, `UnitConverter`, `IdGenerator`) and expects these modules to stay API-compatible.

### Engine Flow Snapshot
1. **Item Normalisation**: Convert raw DTO items into `ProcessedItem` objects, calculating weight via material constants, tagging oversized conditions, and determining manual-handling reasons (>36.5" square or >44" dimension).
2. **Grouping & Boxing**: Items are grouped by material/glass/size class, then split into boxes using the profile’s pieces-per-box rules. Glass boxes are marked for the glass pallet path.
3. **Crate Routing**: When crates are allowed (non-Sunrise and site accepts crates), boxes are bucketed into crate groups using material-specific crate capacities (still box-first, crate-second).
4. **Pallet Routing**: Remaining boxes are loaded on pallets per category: glass → `glass-small`, large → `oversize`, standard → `standard` (spilling to oversize if needed). Heights >84" generate warnings; >102" demand manual follow-up.
5. **Metrics & Warnings**: We tally total pieces, artwork weight, and packaging weight (box tare + pallet/crate tare) and aggregate warnings from rule profile and container height checks.
6. **Adapter**: `mapPlanToDtoStructures` provides Student 2 with DTO-ready structures (items, boxes, containers, manual-handling records) while leaving cost assembly untouched.

## Merge & Conflict Guidance

### When merging Student 2 → feature1
- **DTO Overlap**: Student 2 already defines `PackInputDTO.ts`, `PackOutputDTO.ts`, and `validate.ts`. Replace the temporary files in this branch with Daniel’s authoritative versions, keeping only the additional `piecesPerSet` property if still required.
- **Orchestrator Hook**: Update `app/pack/actions.ts` to import `buildPackingPlan` and `mapPlanToDtoStructures`, removing the inline box/pallet helpers Daniel wrote. Keep cost-calculation and business-intelligence sections intact.
- **Script/Route Imports**: Ensure `scripts/run-pack.mjs` and the API route reference the updated orchestrator only; no changes needed if the orchestrator API remains the same.

### When merging Student 3 → feature1
- **Catalog Data**: Delete the lightweight `app/pack/data/getCatalogs.ts` added here and use Student 3’s richer catalog provider (includes material rules, helper selectors). Adjust imports if file paths differ.
- **Utilities**: Replace the local stub `lib/id.ts` with Student 3’s full ID-generator (and import their `lib/units.ts` if the engine is updated to depend on it later). The current imports are aligned to ease the swap.
- **Rule Alignment**: Review the rule profile and ensure it leverages any extra data Student 3 delivers (e.g., direct crate capacities, client lookups) instead of the current hard-coded placeholders.

### General Merge Tips
- Run `pnpm install` (or preferred package manager) before `tsc --noEmit` and any tests once all three stages are combined.
- Resolve conflicts in TypeScript modules by preferring the downstream branch’s content, then reincorporating the Student 1-specific assumptions (glass pallet strategy, manual-handling fields) as needed.
- After merging, rerun the CLI (`node scripts/run-pack.mjs --example`) to confirm items flagged for manual handling still appear alongside the computed packing plan.

## Outputs Produced
- `PackingPlan` entity capturing processed items, boxes, crates/pallets, warnings, and business-intelligence signals.
- `manualHandlingItems` array with the schema documented in `app/pack/domain/entities/Output.ts`.
- `warnings` array containing human-readable advisory strings (e.g., canvas rule conflict, height exceeds recommendation).

## Future Enhancements
- Replace heuristic pallet selection with optimization once detailed freight-cost curves are available.
- Inject per-client rule profiles (e.g., fragile-first) by wiring additional profile implementations into the rule engine.
- Enrich manual-handling entries with recommended third-party vendors when business details are finalized.
