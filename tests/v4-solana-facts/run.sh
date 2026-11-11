#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc lib/v4-solana-facts/index.ts --target ES2022 --module commonjs --moduleResolution node --lib ES2022,DOM --strict --skipLibCheck --rootDir . --outDir "$build_dir"
V4_FACT_BUILD="$build_dir" node --test tests/v4-solana-facts/*.test.mjs
