#!/bin/bash

# Script to manually validate crate packing test cases
# This is Martin Rivera's responsibility for Feature 2

set -e

TEST_CASES_ROOT="/Users/martinrivera/Documents/GitHub/test_cases/crate_packing"
OUTPUT_DIR="/tmp/crate_packing_results"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Crate Packing Test Cases Validation"
echo "========================================="
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Counter for results
total_tests=0
passed_tests=0

# Function to run a single test case
run_test() {
    local test_path="$1"
    local test_name="$2"
    local input_csv="$test_path/input.csv"
    local expected_json="$test_path/expected_output.json"
    local actual_json="$OUTPUT_DIR/${test_name}.json"
    
    total_tests=$((total_tests + 1))
    
    echo -n "Testing: $test_name ... "
    
    # Run the packaging command
    if pnpm package "$input_csv" "Test Client" "Test Location" "Delivery" yes yes no no no --json-output "$actual_json" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Generated output"
        
        # Display the output
        echo "  Expected output:"
        cat "$expected_json" | jq '.' 2>/dev/null || cat "$expected_json"
        echo ""
        echo "  Actual output:"
        cat "$actual_json" | jq '.' 2>/dev/null || cat "$actual_json"
        echo ""
        
        # Check if expected has non-zero values (real test case vs placeholder)
        if grep -q '"total_pieces": 0' "$expected_json"; then
            echo -e "  ${YELLOW}⚠${NC} Expected output appears to be a placeholder"
        fi
        
        passed_tests=$((passed_tests + 1))
    else
        echo -e "${RED}✗${NC} Failed to generate output"
    fi
    
    echo ""
}

# Test standard_box cases
echo "=== Standard Box Cases ==="
if [ -d "$TEST_CASES_ROOT/standard_box" ]; then
    for test_dir in "$TEST_CASES_ROOT/standard_box"/*; do
        if [ -d "$test_dir" ] && [ -f "$test_dir/input.csv" ]; then
            test_name=$(basename "$test_dir")
            run_test "$test_dir" "standard_box_$test_name"
        fi
    done
else
    echo "standard_box directory not found"
fi
echo ""

# Test large_box cases
echo "=== Large Box Cases ==="
if [ -d "$TEST_CASES_ROOT/large_box" ]; then
    for test_dir in "$TEST_CASES_ROOT/large_box"/*; do
        if [ -d "$test_dir" ] && [ -f "$test_dir/input.csv" ]; then
            test_name=$(basename "$test_dir")
            run_test "$test_dir" "large_box_$test_name"
        fi
    done
else
    echo "large_box directory not found"
fi
echo ""

# Test mixed_boxes cases
echo "=== Mixed Boxes Cases ==="
if [ -d "$TEST_CASES_ROOT/mixed_boxes" ]; then
    for test_dir in "$TEST_CASES_ROOT/mixed_boxes"/*; do
        if [ -d "$test_dir" ] && [ -f "$test_dir/input.csv" ]; then
            test_name=$(basename "$test_dir")
            run_test "$test_dir" "mixed_boxes_$test_name"
        fi
    done
else
    echo "mixed_boxes directory not found"
fi
echo ""

# Summary
echo "========================================="
echo "Summary"
echo "========================================="
echo "Total tests: $total_tests"
echo "Passed: $passed_tests"
echo "Failed: $((total_tests - passed_tests))"
echo ""
echo "Results saved to: $OUTPUT_DIR"
echo "========================================="
