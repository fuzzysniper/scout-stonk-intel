#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc lib/history.ts lib/solana.ts app/api/history/route.ts --target ES2023 --module commonjs --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build_dir"
NODE_PATH="$PWD/node_modules" HISTORY_TEST_BUILD="$build_dir" node --test tests/history.test.mjs tests/history-api.test.mjs tests/history-source.test.mjs
