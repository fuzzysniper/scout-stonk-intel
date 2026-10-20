#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$#" -ne 1 ]; then
  echo 'Usage: bash scripts/cards-research-report.sh <local-capture-input.json>' >&2
  exit 2
fi
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc app/consumer/cards/pipeline.ts --resolveJsonModule --target ES2023 --module commonjs --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build_dir"
CARDS_RESEARCH_BUILD="$build_dir" node scripts/cards-research-report.mjs "$1"
