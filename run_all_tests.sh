#!/bin/bash
# Script to run all test cases (box packing, pallet packing, and crate packing)
# This script runs all test types automatically

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
TEST_SCRIPT="$PROJECT_ROOT/scripts/run-all-pallet-tests.sh"

# Check if the test script exists
if [[ ! -f "$TEST_SCRIPT" ]]; then
  echo "Error: Test script '$TEST_SCRIPT' not found." >&2
  exit 1
fi

echo "========================================="
echo "Running All Test Cases"
echo "========================================="
echo ""

# Track overall results
TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0
OVERALL_FAILED=false

# Function to run tests and capture results
run_test_suite() {
  local test_name="$1"
  local test_dir="$2"
  
  echo "========================================="
  echo "Running $test_name tests"
  echo "========================================="
  echo ""
  
  if [[ ! -d "$test_dir" ]]; then
    echo "⚠️  Test directory '$test_dir' not found, skipping..."
    echo ""
    return
  fi
  
  # Run the test script and capture output
  local output
  output=$("$TEST_SCRIPT" "$test_dir" 2>&1)
  local exit_code=$?
  
  # Display output
  echo "$output"
  echo ""
  
  # Extract test counts from output
  local passed failed total
  passed=$(echo "$output" | grep -oP 'Passed: \K\d+' || echo "0")
  failed=$(echo "$output" | grep -oP 'Failed: \K\d+' || echo "0")
  total=$(echo "$output" | grep -oP 'Total : \K\d+' || echo "0")
  
  TOTAL_TESTS=$((TOTAL_TESTS + total))
  TOTAL_PASSED=$((TOTAL_PASSED + passed))
  TOTAL_FAILED=$((TOTAL_FAILED + failed))
  
  if [[ $exit_code -ne 0 ]] || [[ $failed -gt 0 ]]; then
    OVERALL_FAILED=true
  fi
}

# Run box packing tests
run_test_suite "Box Packing" "$PROJECT_ROOT/test_inputs_and_outputs"

# Run pallet packing tests
run_test_suite "Pallet Packing" "$PROJECT_ROOT/test_data/pallet"

# Run crate packing tests (if test_cases directory exists)
if [[ -d "$PROJECT_ROOT/../test_cases/crate_packing" ]]; then
  run_test_suite "Crate Packing" "$PROJECT_ROOT/../test_cases/crate_packing"
elif [[ -d "$PROJECT_ROOT/test_cases/crate_packing" ]]; then
  run_test_suite "Crate Packing" "$PROJECT_ROOT/test_cases/crate_packing"
fi

# Overall summary
echo "========================================="
echo "Overall Test Summary"
echo "========================================="
echo "  Total Tests: $TOTAL_TESTS"
echo "  Passed: $TOTAL_PASSED"
echo "  Failed: $TOTAL_FAILED"
echo "========================================="
echo ""

if [[ "$OVERALL_FAILED" == true ]] || [[ $TOTAL_FAILED -gt 0 ]]; then
  echo "❌ Some tests failed!"
  exit 1
else
  echo "✅ All tests passed!"
  exit 0
fi
