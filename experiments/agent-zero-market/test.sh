#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc experiments/agent-zero-market/index.ts experiments/agent-zero-market/fixtures.ts experiments/agent-zero-market/demo.ts --target ES2022 --module commonjs --moduleResolution node --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build_dir"
AGENT0_MARKET_BUILD="$build_dir" node --test experiments/agent-zero-market/tests/*.test.mjs
