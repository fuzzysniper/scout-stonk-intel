#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc experiments/live-market/controller.ts experiments/launch-intel/fixtures.ts --target ES2023 --module commonjs --strict --skipLibCheck --resolveJsonModule --esModuleInterop --rootDir . --outDir "$build_dir"
LIVE_MARKET_BUILD="$build_dir/experiments/live-market" node --test experiments/live-market/tests/*.test.mjs
