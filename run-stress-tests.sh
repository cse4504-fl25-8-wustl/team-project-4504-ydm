#!/bin/bash

# Script to run all stress tests from the test_cases repository
# Usage: ./run-stress-tests.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

STRESS_TESTS_DIR="/Users/martinrivera/Documents/GitHub/test_cases/stress_tests"
PASSED=0
FAILED=0
FAILED_TESTS=()

# Function to map folder name to packing strategy
get_strategy_for_folder() {
    local folder_name=$1
    case "$folder_name" in
        "no_mixed_medium_in_same_box")
            echo "first-fit"
            ;;
        "pack_by_depth")
            echo "minimize-boxes"
            ;;
        "strictest_constraint")
            echo "balanced"
            ;;
        "all")
            # "all" tests may use default or mixed strategies
            echo "first-fit"
            ;;
        *)
            # Default to first-fit (pack by medium)
            echo "first-fit"
            ;;
    esac
}

# Function to run a single test
run_test() {
    local test_dir=$1
    local test_name=$2
    local strategy=$3
    
    # Check for input.csv
    if [ ! -f "$test_dir/input.csv" ]; then
        echo -e "${YELLOW}⚠ Skipping $test_name - missing input.csv${NC}"
        return
    fi
    
    # Check for expected output (either .json or .csv file containing JSON)
    local expected_file=""
    if [ -f "$test_dir/expected_output.json" ]; then
        expected_file="$test_dir/expected_output.json"
    elif [ -f "$test_dir/expected_output.csv" ]; then
        expected_file="$test_dir/expected_output.csv"
    else
        echo -e "${YELLOW}⚠ Skipping $test_name - missing expected output${NC}"
        return
    fi
    
    echo -e "\n${YELLOW}Running: $test_name (strategy: $strategy)${NC}"
    
    # Create temp file for JSON output
    local temp_json=$(mktemp)
    
    # Run the packaging command with JSON output and appropriate strategy
    # Default parameters for non-Sunrise client
    pnpm package "$test_dir/input.csv" "TestClient" "TestLocation" "Standard" "true" "false" "true" "false" "false" --strategy "$strategy" --json-output "$temp_json" > /dev/null 2>&1 || {
        echo -e "${RED}✗ FAILED: $test_name - Command execution failed${NC}"
        FAILED=$((FAILED + 1))
        FAILED_TESTS+=("$test_name")
        rm -f "$temp_json"
        return
    }
    
    # Compare JSON output
    if [ -f "$temp_json" ]; then
        # Use jq to compare JSON (ignoring whitespace differences)
        if command -v jq &> /dev/null; then
            # Normalize JSON: convert whole number floats (e.g., 3040.0) to integers (3040)
            # This makes 3040 and 3040.0 equivalent for comparison
            expected=$(jq -S . "$expected_file" | sed -E 's/: ([0-9]+)\.0([,}])/: \1\2/g')
            actual=$(jq -S . "$temp_json" | sed -E 's/: ([0-9]+)\.0([,}])/: \1\2/g')
            
            if [ "$expected" = "$actual" ]; then
                echo -e "${GREEN}✓ PASSED: $test_name${NC}"
                PASSED=$((PASSED + 1))
            else
                echo -e "${RED}✗ FAILED: $test_name - Output mismatch${NC}"
                echo "Expected:"
                echo "$expected"
                echo "Actual:"
                echo "$actual"
                FAILED=$((FAILED + 1))
                FAILED_TESTS+=("$test_name")
            fi
        else
            # Fallback to simple diff if jq not available
            if diff -q "$expected_file" "$temp_json" > /dev/null; then
                echo -e "${GREEN}✓ PASSED: $test_name${NC}"
                PASSED=$((PASSED + 1))
            else
                echo -e "${RED}✗ FAILED: $test_name - Output mismatch${NC}"
                diff "$expected_file" "$temp_json" || true
                FAILED=$((FAILED + 1))
                FAILED_TESTS+=("$test_name")
            fi
        fi
    else
        echo -e "${RED}✗ FAILED: $test_name - No output generated${NC}"
        FAILED=$((FAILED + 1))
        FAILED_TESTS+=("$test_name")
    fi
    
    rm -f "$temp_json"
}

echo "========================================="
echo "Running Stress Tests"
echo "========================================="

# Run all tests
for category_dir in "$STRESS_TESTS_DIR"/*; do
    if [ -d "$category_dir" ]; then
        category_name=$(basename "$category_dir")
        strategy=$(get_strategy_for_folder "$category_name")
        echo -e "\n${YELLOW}Category: $category_name (using strategy: $strategy)${NC}"
        
        for test_dir in "$category_dir"/test*; do
            if [ -d "$test_dir" ]; then
                test_num=$(basename "$test_dir")
                run_test "$test_dir" "$category_name/$test_num" "$strategy"
            fi
        done
    fi
done

# Summary
echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -gt 0 ]; then
    echo ""
    echo "Failed tests:"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "  ${RED}✗ $test${NC}"
    done
    exit 1
else
    echo -e "\n${GREEN}All tests passed!${NC}"
    exit 0
fi
