#!/bin/bash
# Complete Test Suite Runner
# Runs ALL tests in the repository:
# - Unit tests (Vitest) - All *.test.ts and *.spec.ts files
# - Box packing integration tests (test_inputs_and_outputs/)
# - Pallet packing tests (test_data/pallet/)
# - Crate packing tests (test_cases/crate_packing/)
# - Stress tests with strategy-aware runner (test_cases/stress_tests/)
#
# Usage: ./run-complete-test-suite.sh
#
# Note: This script runs tests sequentially and continues even if some fail,
# providing a comprehensive summary at the end.

# Don't exit on error - we want to run all suites
# set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Track overall results
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0
SUITE_RESULTS=()

echo "========================================="
echo "COMPLETE TEST SUITE"
echo "========================================="
echo ""

# Function to run a test suite and track results
run_suite() {
    local suite_name="$1"
    local command="$2"
    
    TOTAL_SUITES=$((TOTAL_SUITES + 1))
    
    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}Running: $suite_name${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
    
    if eval "$command"; then
        echo -e "${GREEN}✓ $suite_name PASSED${NC}"
        PASSED_SUITES=$((PASSED_SUITES + 1))
        SUITE_RESULTS+=("${GREEN}✓${NC} $suite_name")
        return 0
    else
        echo -e "${RED}✗ $suite_name FAILED${NC}"
        FAILED_SUITES=$((FAILED_SUITES + 1))
        SUITE_RESULTS+=("${RED}✗${NC} $suite_name")
        return 1
    fi
}

# 1. Unit Tests (Vitest)
run_suite "Unit Tests (Vitest)" "pnpm test:run" || true

# 2. Box Packing Tests
if [[ -d "test_inputs_and_outputs" ]]; then
    run_suite "Box Packing Tests" "./run-all-tests.sh test_inputs_and_outputs" || true
fi

# 3. Pallet Packing Tests
if [[ -d "test_data/pallet" ]]; then
    run_suite "Pallet Packing Tests" "./run-all-tests.sh test_data/pallet" || true
fi

# 4. Crate Packing Tests
if [[ -d "../test_cases/crate_packing" ]]; then
    run_suite "Crate Packing Tests" "./run-all-tests.sh ../test_cases/crate_packing" || true
elif [[ -d "test_cases/crate_packing" ]]; then
    run_suite "Crate Packing Tests" "./run-all-tests.sh test_cases/crate_packing" || true
fi

# 5. Stress Tests (with strategy-aware runner)
if [[ -d "../test_cases/stress_tests" ]] || [[ -d "/Users/martinrivera/Documents/GitHub/test_cases/stress_tests" ]]; then
    run_suite "Stress Tests (All Strategies)" "./run-stress-tests.sh" || true
fi

# Final Summary
echo ""
echo "========================================="
echo "COMPLETE TEST SUITE SUMMARY"
echo "========================================="
echo ""
echo "Test Suites Run: $TOTAL_SUITES"
echo -e "${GREEN}Passed: $PASSED_SUITES${NC}"
echo -e "${RED}Failed: $FAILED_SUITES${NC}"
echo ""
echo "Results by Suite:"
for result in "${SUITE_RESULTS[@]}"; do
    echo -e "  $result"
done
echo ""
echo "========================================="

if [[ $FAILED_SUITES -gt 0 ]]; then
    echo -e "${RED}❌ Some test suites failed!${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All test suites passed!${NC}"
    exit 0
fi
