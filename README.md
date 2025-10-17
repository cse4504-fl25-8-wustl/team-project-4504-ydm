# team-project-4504-ydm
team-project-4504-ydm was created by GitHub Classroom.

## Developer Guide
- Requires Node.js 20+, pnpm, and the workspace devDependencies. Install prerequisites:
  ```bash
  npm install -g pnpm
  pnpm install
  ```

### Running Tests
This project uses [Vitest](https://vitest.dev/) as the testing framework. The following commands are available:

- **Run all tests once:**
  ```bash
  pnpm test:run
  ```

- **Run tests in watch mode (re-runs on file changes):**
  ```bash
  pnpm test
  ```

- **Run tests with UI (interactive test runner):**
  ```bash
  pnpm test:ui
  ```

- **Run tests with coverage report:**
  ```bash
  pnpm test:coverage
  ```

### Running the Application
- Run the packaging workflow:
  ```bash
  pnpm package <csv-file-path> <client-name> <job-site-location> <service-type> <accepts-pallets> <accepts-crates> <has-loading-dock> <requires-liftgate> <needs-inside-delivery>
  ```
  Boolean flags accept `yes/no`, `true/false`, `y/n`, or `1/0`.
- Example invocation (all dummy data for now):
  ```bash
  pnpm package test_art.csv "MedStar" "Chevy Chase, MD" "Delivery + Installation" yes yes no yes yes
  ```
  For the end-to-end fixtures checked into `input*_test.csv`, you can invoke the CLI the same way, for example:
  ```bash
  pnpm package input1_test.csv "Client" "Location" "Delivery + Installation" yes no no no no
  ```

## Module Ownership Checklist
- **Input & Parsing Pipeline** (`cli/`, `app/parser/`, `app/requests/`)
  - Owner: @Daniel Yan
  - Handle CLI argument validation, error reporting, and request assembly.
  - Implement CSV parsing and map rows into intermediate data structures.
  - Coordinate conversion from parsed data into `Art` entities.
- **Domain Entities & Business Rules** (`app/entities/`)
  - Owner: Yisu Wang
  - Model `Art`, `Box`, `Crate` state and invariants.
  - Enforce capacity, dimension, and special handling rules.
  - Provide weight/volume calculations consumed by interactors.
- **Use Case Orchestration & Responses** (`app/interactors/`, `app/responses/`)
  - Owner: Martin Rivera
  - Implement box/crate packing algorithms and manage fallback paths.
  - Aggregate entity data into `PackagingResponse` DTOs.
  - Maintain response schema evolution as reporting needs change.

## Workflow Overview
1. The CLI (`cli/main.ts`) parses command-line input, normalizes boolean flags, and invokes the CSV parser.
2. `app/parser/CsvParser.ts` currently returns placeholder `Art` entities; it will later hydrate them from the provided CSV file.
3. The resulting `PackagingRequest` aggregates art items, client metadata, and delivery capabilities, then reaches `PackagingInteractor`.
4. `app/interactors/PackagingInteractor.ts` runs dummy packing functions that produce an empty `PackagingResponse` structure.
5. The CLI prints the response as formatted JSON so downstream tooling or developers can inspect the output.

## Project Structure Highlights
- `app/entities` contains the domain entities with dummy implementations.
- `app/interactors` defines the use-case orchestration.
- `app/parser` isolates CSV parsing (currently a stub).
- `app/requests` and `app/responses` host the DTOs that connect the CLI with the use cases.
- `cli/main.ts` is the command-line entry point that wires parser, interactor, and response printing.

## Testing

### Testing Framework
- Test files are co-located with source files using the `.test.ts` extension
- Unit tests are written using Vitest with TypeScript support
- Tests cover entity classes, business logic, and utility functions
- Example test file: `app/entities/Art.test.ts` demonstrates comprehensive testing of the Art entity
- Run end-to-end test: `pnpm vitest tests/e2e/packageEverything.test.ts`

### Testing Responsibilities Distribution

The testing responsibilities have been distributed evenly among the 3 team members based on computational complexity and logical grouping:

**Complexity Analysis:**
- **Input & Parsing Pipeline**: Medium complexity - CSV parsing, data validation, and entity translation
- **Domain Entities & Business Rules**: High complexity - Complex accommodation algorithms, business rule calculations, and weight computations
- **Use Case Orchestration & Response**: High complexity - Packing algorithms, response generation, and orchestration logic

**Distribution Rationale:**
- Each team member is assigned 3-4 files with 8-10 key functions to test
- Responsibilities align with existing module ownership for better domain knowledge
- Complex algorithms are distributed to ensure comprehensive coverage
- Testing workload is balanced across computational complexity levels

#### **@Daniel Yan** - Input & Parsing Pipeline Testing
**Files to Test:**
- `app/parser/CsvParser.ts`
- `app/parser/ArtTranslator.ts`
- `cli/main.ts`

**Key Functions to Test:**
- `CsvParser.parse()` - CSV file parsing and validation
- `CsvParser.parseWithDiagnostics()` - Enhanced parsing with error reporting
- `CsvParser.validateCsvStructure()` - CSV structure validation
- `ArtTranslator.fromCsvRow()` - CSV row to Art entity translation
- `ArtTranslator.normalizeLabel()` - Label normalization logic
- `ArtTranslator.parseHardwarePieces()` - Hardware parsing logic
- `main()` - CLI argument parsing and boolean normalization
- `parseBoolean()` - Boolean string parsing

#### **Yisu Wang** - Domain Entities & Business Rules Testing
**Files to Test:**
- `app/entities/Box.ts`
- `app/entities/Crate.ts`
- `app/rules/PackagingRules.ts`
- `app/calculations/WeightCalculator.ts`

**Key Functions to Test:**
- `Box.canAccommodate()` - Complex accommodation logic with multiple constraints
- `Box.addArt()` - Art addition with state updates and calculations
- `Box.fitsDimensions()` - Dimension fitting logic for different box types
- `Crate.canAccommodate()` - Container accommodation logic
- `Crate.addBox()` - Box addition with weight calculations
- `PackagingRules.requiresSpecialHandling()` - Special handling determination
- `PackagingRules.requiresOversizeBox()` - Oversize box logic
- `PackagingRules.getPackagingRecommendation()` - Packaging recommendation algorithm
- `WeightCalculator.calculateWeight()` - Weight calculation with material factors
- `WeightCalculator.calculateTotalWeight()` - Batch weight calculations

#### **Martin Rivera** - Use Case Orchestration & Response Testing
**Files to Test:**
- `app/interactors/PackagingInteractor.ts`
- `app/utils/DimensionUtils.ts`

**Key Functions to Test:**
- `PackagingInteractor.packBoxes()` - Box packing algorithm
- `PackagingInteractor.packContainers()` - Container packing algorithm
- `PackagingInteractor.packageEverything()` - Main orchestration method
- `PackagingInteractor.buildWeightSummary()` - Weight summary calculations
- `PackagingInteractor.buildPackingSummary()` - Packing summary generation
- `PackagingInteractor.buildBusinessIntelligence()` - Business intelligence logic
- `PackagingInteractor.buildFreightExport()` - Freight export generation
- `PackagingInteractor.calculateCrateFootprint()` - Crate dimension calculations
- `DimensionUtils.roundUpDimension()` - Dimension rounding logic
- `DimensionUtils.getPlanarFootprint()` - Planar footprint calculations
- `DimensionUtils.fitsWithin()` - Dimension fitting validation
