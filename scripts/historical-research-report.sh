#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc scripts/historical-research-report.ts --resolveJsonModule --target ES2023 --module commonjs --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build_dir"
node "$build_dir/scripts/historical-research-report.js"
