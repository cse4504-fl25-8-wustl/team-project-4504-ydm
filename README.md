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
- Test files are co-located with source files using the `.test.ts` extension
- Unit tests are written using Vitest with TypeScript support
- Tests cover entity classes, business logic, and utility functions
- Example test file: `app/entities/Art.test.ts` demonstrates comprehensive testing of the Art entity
