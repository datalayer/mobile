#!/usr/bin/env bash
# Keeps the e2e tokens out of the Maestro results the Check workflow uploads (its artifacts are
# public): drops Maestro's commands.json and maestro.log, which hold every -e value, then any
# file holding E2E_TOKEN or E2E_SECOND_TOKEN, and fails if one is still found.
set -euo pipefail
paths=()
for path in "$@"; do [ -e "$path" ] && paths+=("$path"); done
[ ${#paths[@]} -eq 0 ] && exit 0
find "${paths[@]}" -type f \( -name commands.json -o -name maestro.log \) -exec rm -f {} +
for token in "${E2E_TOKEN:-}" "${E2E_SECOND_TOKEN:-}"; do
  [ -n "$token" ] || continue
  { grep -rlF --null -e "$token" "${paths[@]}" || true; } | xargs -0 rm -f --
  if grep -rqF -e "$token" "${paths[@]}"; then
    echo "A token is still in the results: nothing is uploaded." >&2
    exit 1
  fi
done
echo "Results kept: $(find "${paths[@]}" -type f | wc -l | tr -d ' ') files."
