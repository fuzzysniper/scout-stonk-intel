#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc scripts/pair-reward-audit.ts --target ES2023 --module commonjs --strict --skipLibCheck --esModuleInterop --resolveJsonModule --rootDir . --outDir "$build_dir"
NODE_PATH="$PWD/node_modules" node "$build_dir/scripts/pair-reward-audit.js" "${1:-docs/evidence/pair-reward-audit-2026-10-14.json}"
