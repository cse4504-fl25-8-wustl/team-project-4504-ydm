#!/bin/bash
set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required to run this script." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
TEST_CASE_ROOT="${1:-$(cd "$PROJECT_ROOT/.." && pwd)/test_cases}"

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

  local expected_keys
  expected_keys="$(jq 'keys' "$expected")"

  jq --argjson keys "$expected_keys" '
    with_entries(select(.key as $k | $keys | index($k)))
  ' "$actual" | jq -S . >"$actual_subset"

  jq -S . "$expected" >"$expected_sorted"

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

  local output_json
  output_json="$(mktemp)"
  local cli_out cli_err
  cli_out="$(mktemp)"
  cli_err="$(mktemp)"

  if pnpm --silent package \
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

  while IFS= read -r -d '' csv_file; do
    local test_dir expected_json rel_path
    test_dir="$(dirname "$csv_file")"
    expected_json="$test_dir/expected_output.json"
    rel_path="${csv_file#$TEST_CASE_ROOT/}"

    ((TOTAL++))
    echo "Running $rel_path ..."

    if [[ ! -f "$expected_json" ]]; then
      echo "  ❌ Missing expected_output.json" >&2
      ((FAILED++))
      FAILURES+=("$rel_path (missing expected output)")
      continue
    fi

    local actual_json_path cli_output
    if cli_output="$(run_cli "$csv_file" "$accepts_crates_flag")"; then
      actual_json_path="$cli_output"
    else
      echo "  ❌ CLI execution failed" >&2
      ((FAILED++))
      FAILURES+=("$rel_path (CLI execution failed)")
      continue
    fi

    if compare_json "$actual_json_path" "$expected_json"; then
      echo "  ✅ PASS"
      ((PASSED++))
    else
      echo "  ❌ FAIL (see diff above)"
      ((FAILED++))
      FAILURES+=("$rel_path (JSON mismatch)")
    fi

    rm -f "$actual_json_path"
  done < <(find "$input_dir" -type f -name "input.csv" -print0)
}

process_csv_files "$TEST_CASE_ROOT/box_packing" no
process_csv_files "$TEST_CASE_ROOT/pallet_packing" no
process_csv_files "$TEST_CASE_ROOT/crate_packing" yes

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
