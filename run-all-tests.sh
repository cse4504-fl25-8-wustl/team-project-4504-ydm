#!/bin/bash
# Script to run all test cases (box packing, pallet packing, and crate packing)
# This script discovers all test cases (directories containing input.csv and expected_output.json)
# and runs them using pnpm package, reporting which passed and which failed.
# 
# Usage: ./run-all-tests.sh [test_cases_root]
# Examples:
#   ./run-all-tests.sh                    # Run all test types automatically
#   ./run-all-tests.sh test_inputs_and_outputs  # Box packing tests
#   ./run-all-tests.sh test_data/pallet        # Pallet packing tests
#   ./run-all-tests.sh test_cases/crate_packing # Crate packing tests
#
# Don't exit on error - we want to continue testing even if one fails
# set -e
# Note: pipefail may not be available in all bash versions
set -o pipefail 2>/dev/null || true

# Check for jq or use Node.js as fallback
HAS_JQ=false
HAS_NODE=false
NODE_CMD=""

if command -v jq >/dev/null 2>&1; then
  HAS_JQ=true
elif command -v node >/dev/null 2>&1; then
  HAS_NODE=true
  NODE_CMD="node"
elif command -v cmd.exe >/dev/null 2>&1 && cmd.exe /c "where node" >/dev/null 2>&1; then
  # Try using Windows node via cmd.exe
  HAS_NODE=true
  NODE_CMD="cmd.exe /c node"
else
  echo "Error: Either jq or node is required to run this script." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
TEST_CASE_ROOT="${1:-}"

# If no argument provided, run all test types automatically
if [[ -z "$TEST_CASE_ROOT" ]]; then
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
    
    # Recursively call this script with the test directory
    local output
    output=$(bash "$0" "$test_dir" 2>&1)
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
fi

# If argument provided, run tests for that specific directory
cd "$PROJECT_ROOT"

if [[ ! -d "$TEST_CASE_ROOT" ]]; then
  echo "Error: test case directory '$TEST_CASE_ROOT' not found." >&2
  exit 1
fi

TOTAL=0
PASSED=0
FAILED=0
FAILURES=()

# Compares relevant JSON slices so CLI schema changes do not break fixture diffs.
compare_json() {
  local actual="$1"
  local expected="$2"

  local actual_subset expected_sorted
  actual_subset="$(mktemp)"
  expected_sorted="$(mktemp)"

  if [ "$HAS_JQ" = true ]; then
    # Use jq if available
    local expected_keys
    expected_keys="$(jq 'keys' "$expected")"

    jq --argjson keys "$expected_keys" '
      with_entries(select(.key as $k | $keys | index($k)))
    ' "$actual" | jq -S . >"$actual_subset"

    jq -S . "$expected" >"$expected_sorted"
  else
    # Use Node.js as fallback
    # Convert paths to Windows format if using cmd.exe
    local actual_path="$actual"
    local expected_path="$expected"
    local actual_subset_path="$actual_subset"
    local expected_sorted_path="$expected_sorted"
    
    if [[ "$NODE_CMD" == *"cmd.exe"* ]]; then
      actual_path=$(wslpath -w "$actual" 2>/dev/null || echo "$actual")
      expected_path=$(wslpath -w "$expected" 2>/dev/null || echo "$expected")
      actual_subset_path=$(wslpath -w "$actual_subset" 2>/dev/null || echo "$actual_subset")
      expected_sorted_path=$(wslpath -w "$expected_sorted" 2>/dev/null || echo "$expected_sorted")
    fi
    
    $NODE_CMD -e "
      const fs = require('fs');
      const actual = JSON.parse(fs.readFileSync('$actual_path', 'utf8'));
      const expected = JSON.parse(fs.readFileSync('$expected_path', 'utf8'));
      const expectedKeys = Object.keys(expected);
      const actualSubset = {};
      expectedKeys.forEach(key => {
        if (actual.hasOwnProperty(key)) {
          actualSubset[key] = actual[key];
        }
      });
      fs.writeFileSync('$actual_subset_path', JSON.stringify(actualSubset, null, 2) + '\n');
      fs.writeFileSync('$expected_sorted_path', JSON.stringify(expected, null, 2) + '\n');
    "
  fi

  if diff -u "$expected_sorted" "$actual_subset"; then
    rm -f "$actual_subset" "$expected_sorted"
    return 0
  else
    rm -f "$actual_subset" "$expected_sorted"
    return 1
  fi
}

# Runs the CLI for a single CSV and writes JSON output to a temp file.
run_cli() {
  local csv_file="$1"
  local accepts_crates="$2"

  # Use Windows temp directory if using cmd.exe, otherwise use WSL temp
  local output_json
  local cli_out cli_err
  
  if [[ "$NODE_CMD" == *"cmd.exe"* ]]; then
    # Use Windows temp directory
    local win_temp=$(cmd.exe /c "echo %TEMP%" 2>/dev/null | tr -d '\r\n')
    local wsl_temp=$(wslpath -u "$win_temp" 2>/dev/null || echo "/tmp")
    output_json="$wsl_temp/$(basename "$csv_file" .csv)_$$.json"
    cli_out="$wsl_temp/cli_out_$$.txt"
    cli_err="$wsl_temp/cli_err_$$.txt"
  else
    output_json="$(mktemp)"
    cli_out="$(mktemp)"
    cli_err="$(mktemp)"
  fi

  # Use pnpm package directly (package is already a script in package.json)
  local pnpm_cmd="pnpm"
  if [[ "$NODE_CMD" == *"cmd.exe"* ]]; then
    pnpm_cmd="cmd.exe /c pnpm"
    # Convert paths to Windows format for cmd.exe
    csv_file=$(wslpath -w "$csv_file" 2>/dev/null || echo "$csv_file")
    output_json=$(wslpath -w "$output_json" 2>/dev/null || echo "$output_json")
  fi

  if $pnpm_cmd package \
    "$csv_file" \
    "Automated Client" \
    "Automated Location" \
    "Automated Delivery" \
    yes \
    "$accepts_crates" \
    no \
    no \
    no \
    --json-output "$output_json" \
    >"$cli_out" 2>"$cli_err"
  then
    # Convert output path back to WSL format if needed
    if [[ "$NODE_CMD" == *"cmd.exe"* ]]; then
      output_json=$(wslpath -u "$output_json" 2>/dev/null || echo "$output_json")
    fi
    rm -f "$cli_out" "$cli_err"
    echo "$output_json"
  else
    echo "CLI failed for $csv_file" >&2
    cat "$cli_err" >&2
    rm -f "$cli_out" "$cli_err" "$output_json"
    return 1
  fi
}

# Finds every input.csv under a directory tree and evaluates it.
process_csv_files() {
  local input_dir="$1"
  local accepts_crates_flag="$2"

  if [[ ! -d "$input_dir" ]]; then
    return
  fi

  # Collect all CSV files first, then process them
  local csv_files=()
  while IFS= read -r -d '' csv_file; do
    [ -n "$csv_file" ] && csv_files+=("$csv_file")
  done < <(find "$input_dir" -type f -name "input.csv" -print0 2>/dev/null || true)
  
  # Process each CSV file
  for csv_file in "${csv_files[@]}"; do
    local test_dir expected_json rel_path
    test_dir="$(dirname "$csv_file")"
    expected_json="$test_dir/expected_output.json"
    rel_path="${csv_file#$TEST_CASE_ROOT/}"

    ((TOTAL++))
    echo -n "[$TOTAL] Testing: $rel_path ... "

    if [[ ! -f "$expected_json" ]]; then
      echo "❌ FAIL (missing expected_output.json)" >&2
      ((FAILED++))
      FAILURES+=("$rel_path (missing expected output)")
      continue
    fi

    local actual_json_path cli_output
    if cli_output="$(run_cli "$csv_file" "$accepts_crates_flag")"; then
      actual_json_path="$cli_output"
    else
      echo "❌ FAIL (CLI execution failed)" >&2
      ((FAILED++))
      FAILURES+=("$rel_path (CLI execution failed)")
      continue
    fi

    if compare_json "$actual_json_path" "$expected_json" >/dev/null 2>&1; then
      echo "✅ PASS"
      ((PASSED++))
    else
      echo "❌ FAIL (output mismatch)"
      echo "  Expected: $expected_json"
      echo "  Actual: $actual_json_path"
      echo "  Diff:"
      compare_json "$actual_json_path" "$expected_json" 2>&1 | head -20 || true
      ((FAILED++))
      FAILURES+=("$rel_path (JSON mismatch)")
    fi

    rm -f "$actual_json_path"
  done
}

# Process test cases from different directory structures
# Check for box_packing, pallet_packing, crate_packing (test_cases repository structure)
process_csv_files "$TEST_CASE_ROOT/box_packing" no
process_csv_files "$TEST_CASE_ROOT/pallet_packing" no
process_csv_files "$TEST_CASE_ROOT/crate_packing" yes

# Also check for test_data/pallet structure (local test data)
if [[ -d "$TEST_CASE_ROOT" ]] && [[ "$TEST_CASE_ROOT" == *"test_data"* ]] || [[ "$TEST_CASE_ROOT" == *"pallet"* ]]; then
  # If the root is test_data/pallet or contains pallet, process it directly
  if [[ -d "$TEST_CASE_ROOT/standard_pallet" ]] || [[ -d "$TEST_CASE_ROOT/oversized_pallet" ]]; then
    process_csv_files "$TEST_CASE_ROOT" no
  fi
fi

# Also check for crate_packing structure (crate packing test data)
if [[ -d "$TEST_CASE_ROOT" ]] && [[ "$TEST_CASE_ROOT" == *"crate_packing"* ]]; then
  # If the root is crate_packing or contains crate_packing, process it directly
  # Crate packing test cases have accepts_crates=yes
  if [[ -d "$TEST_CASE_ROOT/standard_box" ]] || [[ -d "$TEST_CASE_ROOT/large_box" ]] || [[ -d "$TEST_CASE_ROOT/mixed_boxes" ]]; then
    process_csv_files "$TEST_CASE_ROOT" yes
  fi
fi

echo
echo "Test summary:"
echo "  Total : $TOTAL"
echo "  Passed: $PASSED"
echo "  Failed: $FAILED"

if [[ $FAILED -gt 0 ]]; then
  echo
  echo "Failed cases:"
  for failure in "${FAILURES[@]}"; do
    echo "  - $failure"
  done
  exit 1
fi
