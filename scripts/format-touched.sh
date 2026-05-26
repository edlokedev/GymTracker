#!/usr/bin/env bash
# format-touched.sh — run biome format only on files changed in the working tree.
# Prevents the "format churns 18 unrelated files" problem.
#
# Usage:
#   bash scripts/format-touched.sh          # formats all unstaged modified files
#   bash scripts/format-touched.sh --staged # formats staged files only

set -euo pipefail

MODE="${1:-}"

if [ "$MODE" = "--staged" ]; then
  FILES=$(git diff --name-only --cached | grep -E '\.(ts|tsx|js|jsx|json|css)$' || true)
else
  FILES=$(git diff --name-only | grep -E '\.(ts|tsx|js|jsx|json|css)$' || true)
  # Also include untracked files that are new (not yet committed)
  UNTRACKED=$(git ls-files --others --exclude-standard | grep -E '\.(ts|tsx|js|jsx|json|css)$' || true)
  FILES=$(printf '%s\n%s' "$FILES" "$UNTRACKED" | grep -v '^$' || true)
fi

if [ -z "$FILES" ]; then
  echo "format-touched: no touched source files to format"
  exit 0
fi

echo "format-touched: formatting $(echo "$FILES" | wc -l | tr -d ' ') file(s):"
echo "$FILES" | sed 's/^/  /'

# shellcheck disable=SC2086
bunx biome format --write $FILES
