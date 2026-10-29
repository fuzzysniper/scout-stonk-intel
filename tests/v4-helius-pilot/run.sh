#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build_dir=$(mktemp -d /tmp/v4-pilot-221-XXXXXX)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc lib/v4-helius-pilot/server/testing.ts --target ES2022 --module commonjs --moduleResolution node --lib ES2022,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build_dir"
export V4_PILOT_BUILD="$build_dir"
export NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules"
NODE_ENV=test node --conditions=react-server --test tests/v4-helius-pilot/*.test.mjs
