# team-project-4504-ydm
team-project-4504-ydm was created by GitHub Classroom.

## Running the App on macOS

If you download the app from GitHub Releases and see **"App is damaged and can't be opened"**, this is because the app is not signed with an Apple Developer certificate.

**To fix this, run the following command in Terminal:**

```bash
xattr -cr /Applications/ARCH\ Freight\ Calculator.app
```

Or if the app is in your Downloads folder:

```bash
xattr -cr ~/Downloads/ARCH\ Freight\ Calculator.app
```

After running this command, you can open the app normally.

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

### End-to-End Regression Suite
In addition to unit tests we keep full-run fixtures so everyone can verify JSON output stays aligned with goldens.

- **Run all tests** (box packing, pallet packing, and crate packing):
  ```bash
  ./run-all-tests.sh
  ```
  This script automatically runs all test types and provides a comprehensive summary.
  
- **Run specific test types** by specifying a directory:
  ```bash
  ./run-all-tests.sh test_inputs_and_outputs  # Box packing tests
  ./run-all-tests.sh test_data/pallet        # Pallet packing tests
  ./run-all-tests.sh test_cases/crate_packing # Crate packing tests
  ```
- **Official `test_cases` repository**: the upstream copy still contains placeholder values (`X`, `Y`, `Z`, zeroed expected outputs). Before using the script against `../test_cases`, make sure every CSV/JSON pair has been filled out with real client data; otherwise the parser will continue to error out on unknown media/dimensions even though the application logic is correct.
  
The script exits non‑zero when any case fails, making it CI-friendly once both data sets are fully populated.

**Note:** The script uses `pnpm package` to run test cases and uses Node.js for JSON comparison (with `jq` as fallback if available), making it work on Windows/WSL environments.

### Complete Test Suite
Run **ALL** tests in the repository with a single command:

```bash
./run-complete-test-suite.sh
```

This comprehensive test runner executes:
1. **Unit Tests** (Vitest) - All `*.test.ts` and `*.spec.ts` files
2. **Box Packing Integration Tests** - Tests in `test_inputs_and_outputs/`
3. **Pallet Packing Tests** - Tests in `test_data/pallet/`
4. **Crate Packing Tests** - Tests in `test_cases/crate_packing/` (if available)
5. **Stress Tests** - Strategy-aware tests in `test_cases/stress_tests/`

The script continues running even if some tests fail and provides a comprehensive summary at the end.

### Individual Test Suites

#### Stress Tests
The project includes a comprehensive stress test suite that validates different packing strategies:

- **Run all stress tests:**
  ```bash
  ./run-stress-tests.sh
  ```
  
  This script automatically:
  - Detects the packing strategy based on test folder name
  - Runs tests with the appropriate strategy (`first-fit`, `balanced`, or `minimize-boxes`)
  - Compares JSON output against expected results
  - Provides a summary of passed/failed tests
  
  **Test Categories:**
  - `all/` - General tests (uses `first-fit` strategy)
  - `no_mixed_medium_in_same_box/` - Tests for Pack by Medium strategy (`first-fit`)
  - `pack_by_depth/` - Tests for Pack by Depth strategy (`minimize-boxes`)
  - `strictest_constraint/` - Tests for Pack by Strictest Constraint strategy (`balanced`)

#### Legacy Integration Tests
- **Run box/pallet/crate tests individually:**
  ```bash
  ./run-all-tests.sh test_inputs_and_outputs  # Box packing tests
  ./run-all-tests.sh test_data/pallet        # Pallet packing tests
  ./run-all-tests.sh test_cases/crate_packing # Crate packing tests
  ```

### Running the Application

#### Command Line Interface (CLI)
- Run the packaging workflow:
  ```bash
  pnpm package <csv-file-path> <client-name> <job-site-location> <service-type> <accepts-pallets> <accepts-crates> <has-loading-dock> <requires-liftgate> <needs-inside-delivery> [--strategy <strategy-id>] [--json-output <output-file>]
  ```
  Boolean flags accept `yes/no`, `true/false`, `y/n`, or `1/0`.
  
  **Packing Strategy Options** (use with `--strategy` or `-s` flag):
  - `first-fit` - Pack by Medium (no mixed mediums in same box) - **Default**
  - `balanced` - Pack by Strictest Constraint (uses most restrictive limit when mixing)
  - `minimize-boxes` - Pack by Depth (considers physical depth when stacking)
  
  Example with strategy:
  ```bash
  pnpm package input.csv "Client" "Location" "Delivery" yes no yes no no --strategy balanced
  ```

#### Graphical User Interface (GUI)
- **Development mode** (with hot reload):
  ```bash
  pnpm dev
  ```
  Then open your browser to `http://localhost:3000/gui`

- **Electron desktop app** (development):
  ```bash
  pnpm electron:dev
  ```
  This will start the Next.js dev server and launch the Electron window automatically.
  If Electron ever complains about a corrupt install (e.g. `Electron failed to install correctly`), rerun
  ```bash
  pnpm exec node node_modules/.pnpm/electron@<version>/node_modules/electron/install.js
  ```
  to re-extract the binary.
  
- **Optional JSON Output:** Use the `--json-output` (or `-j`) flag to write results to a JSON file:
  ```bash
  pnpm package input.csv "Client" "Location" "Delivery" yes no no no no --json-output output.json
  ```
  The JSON output follows this schema:
  ```json
  {
    "total_pieces": <number>,
    "standard_size_pieces": <number>,
    "oversized_pieces": [
      {
        "side1": <number>,
        "side2": <number>,
        "quantity": <number>
      }
    ],
    "standard_box_count": <number>,
    "large_box_count": <number>,
    "custom_piece_count": <number>,
    "standard_pallet_count": <number>,
    "oversized_pallet_count": <number>,
    "crate_count": <number>,
    "total_artwork_weight": <number>,
    "total_packaging_weight": <number>,
    "final_shipment_weight": <number>
  }
  ```
  
- Example invocation (all dummy data for now):
  ```bash
  pnpm package test_art.csv "MedStar" "Chevy Chase, MD" "Delivery + Installation" yes yes no yes yes
  ```
  For the end-to-end fixtures checked into `input*_test.csv`, you can invoke the CLI the same way, for example:
  ```bash
  pnpm package input1_test.csv "Client" "Location" "Delivery + Installation" yes no no no no
  ```

### Building One-Click Executables

This guide explains how to build standalone installers for Windows and macOS that users can download and install with a single click.

#### Prerequisites

**Common Requirements:**
- Node.js 20 or higher
- pnpm installed globally (`npm install -g pnpm`)
- All project dependencies installed (`pnpm install`)

**Platform-Specific Requirements:**
- **macOS**: macOS 13+ with Xcode Command Line Tools installed (`xcode-select --install`)
- **Windows**: Windows 10/11 with Administrator privileges (required for symlink creation during build)

#### Building for macOS

**Option 1: Using the Build Script (Recommended)**
```bash
./scripts/build-electron.sh mac
```

**Option 2: Direct pnpm Command**
```bash
pnpm electron:build:mac
```

**What Happens:**
1. Builds the Next.js application in standalone mode
2. Copies static assets to the standalone directory
3. Packages everything into a `.dmg` installer using electron-builder

**Output:**
- Location: `dist/ARCH Freight Calculator-1.0.0.dmg`
- Users can double-click the `.dmg` file, then drag the app to Applications

#### Building for Windows

**Important:** Windows builds require Administrator privileges due to symlink creation during the Next.js standalone build process.

**Option 1: Using PowerShell Script (Recommended)**
1. Right-click `build-windows.ps1` in the project root
2. Select "Run with PowerShell"
3. Click "Yes" when prompted for Administrator privileges
4. The script will automatically check for admin rights and guide you through the build

**Option 2: Using Batch Script**
1. Right-click `build-windows.bat` in the project root
2. Select "Run as administrator"
3. The script will check for admin rights and run the build

**Option 3: Manual Command (PowerShell as Administrator)**
1. Open PowerShell as Administrator (Right-click → "Run as Administrator")
2. Navigate to the project directory:
   ```powershell
   cd D:\path\to\team-project-4504-ydm
   ```
3. Run the build:
   ```powershell
   pnpm electron:build:win
   ```

**Option 4: Using the Build Script (Linux/WSL)**
```bash
./scripts/build-electron.sh win
```

**What Happens:**
1. Builds the Next.js application in standalone mode
2. Copies static assets to the standalone directory
3. Packages everything into an `.exe` installer using electron-builder

**Output:**
- Location: `dist/ARCH Freight Calculator Setup 1.0.0.exe`
- Users can double-click the `.exe` file to run the installer

**Troubleshooting Windows Builds:**
- **Symlink Permission Error**: Make sure you're running PowerShell/Terminal as Administrator
- **Alternative**: Enable Windows Developer Mode (Settings → Privacy & Security → For developers → Developer Mode)

#### Build Output Summary

| Platform | Output File | Location | Size (Approx.) |
|----------|-------------|----------|----------------|
| macOS | `ARCH Freight Calculator-1.0.0.dmg` | `dist/` | ~250-500 MB |
| Windows | `ARCH Freight Calculator Setup 1.0.0.exe` | `dist/` | ~140-200 MB |

#### Testing the Build Locally

1. **Install dependencies** (if not already done):
   ```bash
   pnpm install
   ```

2. **Build the application** using one of the methods above

3. **Locate the installer** in the `dist/` directory

4. **Test the installer:**
   - **macOS**: Open the `.dmg` file and drag the app to Applications, then launch it
   - **Windows**: Run the `.exe` installer, follow the installation wizard, then launch the app from Start menu

5. **Verify functionality:**
   - The GUI should load correctly
   - Test uploading a CSV file
   - Verify the packaging calculation works

#### Notes

- **Icon Files**: Custom icon files (`electron/icon.icns` for Mac and `electron/icon.ico` for Windows) can be added for production builds. The build will use default Electron icons if custom icons are not provided.
- **Build Time**: First build may take 5-10 minutes as it downloads Electron binaries. Subsequent builds are faster.
- **File Size**: The installers include the entire Next.js application and all dependencies, so they are relatively large.

### Alpha Release Responsibilities

#### Martin Rivera - GUI Development
- **Graphical User Interface** (`app/gui/`, `app/api/`)
  - Created minimal GUI with CSV upload functionality
  - Implemented API route for backend processing
  - Developed shared service layer to avoid CLI/GUI duplication
  - Ensured GUI uses same dependencies as CLI (clean architecture)
  - Verified no regression in existing CLI functionality

#### Daniel Yan - Windows Build
- **Windows Executable Build**
  - Configure and test Windows build process locally
  - Create Windows installer (.exe) using electron-builder
  - Document Windows-specific build requirements
  - Test one-click installation on Windows platform

#### Yisu Wang - Mac Build
- **macOS Executable Build**
  - Configure and test macOS build process locally
  - Create macOS installer (.dmg) using electron-builder
  - Document macOS-specific build requirements (Xcode tools, etc.)
  - Test one-click installation on macOS platform

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

### Command Line Interface (CLI)
1. The CLI (`cli/main.ts`) parses command-line input, normalizes boolean flags, and invokes the shared `PackagingService`.
2. `PackagingService` validates the CSV file and parses art items using `app/parser/CsvParser.ts`.
3. The resulting `PackagingRequest` aggregates art items, client metadata, and delivery capabilities, then reaches `PackagingInteractor`.
4. `app/interactors/PackagingInteractor.ts` runs the packing algorithms and produces a `PackagingResponse` structure.
5. The CLI prints the response as formatted text or JSON (if `--json-output` flag is used).

### Graphical User Interface (GUI)
1. The GUI (`app/gui/page.tsx`) presents a form for CSV upload and delivery configuration.
2. On form submission, the GUI sends the data to the API route (`app/api/package/route.ts`).
3. The API route saves the uploaded CSV to a temporary file and invokes the shared `PackagingService`.
4. The `PackagingService` processes the request identically to the CLI workflow.
5. The API returns the `PackagingResponse` as JSON, which the GUI displays in a user-friendly format.

### Shared Service Layer
Both CLI and GUI use the same `PackagingService` (`app/services/PackagingService.ts`) to avoid code duplication. This ensures:
- Consistent business logic across delivery mechanisms
- Single source of truth for packaging calculations
- Easier testing and maintenance

## Project Structure Highlights
- `app/entities` - Domain entities (`Art`, `Box`, `Crate`, etc.) with business logic
- `app/interactors` - Use-case orchestration and packing algorithms
- `app/parser` - CSV parsing and data validation
- `app/services` - Shared service layer used by both CLI and GUI
- `app/requests` and `app/responses` - DTOs for request/response data
- `app/api` - Next.js API routes for GUI backend
- `app/gui` - React-based graphical user interface
- `cli/main.ts` - Command-line entry point
- `electron/` - Electron configuration for desktop app
- `scripts/` - Build and utility scripts

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

## Feature 2 Work Plan

### Overview
Feature 2 focuses on implementing compatibility with the test_cases repository format and adding JSON output functionality. The application must:
- Work with the input file format used in the test_cases GitHub repository
- Accept an optional command line argument with a JSON output file name
- Write results to that file in the JSON format specified in Feature 2 development
- Pass all test cases from the test_cases repository

**Timeline:**
- **Week 1:** Half of the test cases must pass (box_packing tests)
- **Week 2:** All remaining test cases must pass (crate_packing and pallet_packing tests)

### Team Responsibilities

#### **Yisu Wang** - Input Format Compatibility & Box Packing Tests
**Responsibilities:**
- Update CSV parser to handle test_cases repository input format
- Ensure compatibility with varying CSV structures across test categories
- Implement and validate box packing logic for all box_packing test cases:
  - `SameMediumSameSize/` (StandardBox, LargeBox)
  - `SameMediumMixedSize/`
  - `MixedMediumSameSize/`
  - `VaryingSizes/` (13 dimension variations)
- Debug and fix any parsing issues with edge cases
- Ensure proper handling of dimension variations (X, X placeholders)

#### **Martin Rivera** - JSON Output & Crate Packing Tests
**Responsibilities:**
- Implement JSON output functionality with optional file argument
- Design and implement JSON output format matching test_cases expected_output.json structure
- Add command-line argument parsing for optional JSON output file name
- Implement and validate crate packing logic for all crate_packing test cases:
  - `standard_box/`
  - `large_box/`
  - `mixed_boxes/`
- Ensure JSON output includes all required fields (total_pieces, box counts, etc.)
- Handle file I/O operations and error handling for JSON output

#### **Daniel Yan** - Test Integration & Pallet Packing Tests
**Responsibilities:**
- Set up automated test runner for test_cases repository
- Create test harness to validate against expected_output.json files
- Implement and validate pallet packing logic for all pallet_packing test cases:
  - `standard_pallet/`
  - `oversized_pallet/`
- Build comparison utilities to diff actual vs expected JSON output
- Create test reporting dashboard showing pass/fail status
- Coordinate integration between parser updates and output format

### Workflow

Our team will use a **feature branch workflow with pull request reviews**:

1. **Branch Strategy:**
   - The `feature2` branch serves as our integration branch for Feature 2 work
   - Each team member creates individual feature branches off `feature2` (e.g., `daniel/catalog-data`, `yisu/unit-conversions`, `martin/id-system`)
   - Work is done in isolation on personal feature branches

2. **Development Process:**
   - Each developer works on their assigned responsibilities in their own branch
   - Commits are made frequently with clear, descriptive messages
   - Code is tested locally before submitting for review

3. **Pull Request & Review:**
   - When a feature is complete, the developer opens a pull request to merge into `feature2`
   - At least one other team member reviews the PR
   - Reviewers check for:
     - Code quality and adherence to project standards
     - Proper test coverage
     - Documentation and comments
     - Integration with existing code
   - Feedback is addressed through additional commits
   - Once approved, the PR is merged into `feature2`

4. **Integration & Testing:**
   - After merging to `feature2`, the team verifies integration
   - End-to-end tests are run to ensure all components work together
   - Any integration issues are addressed promptly

5. **Communication:**
   - Team members communicate progress and blockers regularly
   - Dependencies between tasks are identified early
   - Code reviews are completed within 24 hours when possible

This workflow ensures code quality, knowledge sharing, and reduces the risk of conflicts while maintaining a clean commit history.
