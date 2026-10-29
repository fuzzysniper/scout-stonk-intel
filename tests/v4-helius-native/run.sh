#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build_dir=$(mktemp -d /tmp/v4-native-232-XXXXXX)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc lib/v4-helius-native/*.ts lib/v4-owner-ledger/*.ts lib/v4-helius-pilot/server/testing.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build_dir"
export V4_NATIVE_BUILD="$build_dir" V4_OWNER_BUILD="$build_dir" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
node --conditions=react-server --test --test-concurrency=1 tests/v4-helius-native/*.test.mjs
