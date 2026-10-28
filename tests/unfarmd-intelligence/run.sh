#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
intelligence_build=$(mktemp -d /tmp/unfarmd-intelligence-XXXXXX)
trap 'rm -rf "$intelligence_build"' EXIT
./node_modules/.bin/tsc lib/unfarmd-intelligence/index.ts lib/trader-pulse/adapter.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$intelligence_build"
export INTELLIGENCE_BUILD="$intelligence_build"
export NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules"
for intelligence_test in tests/unfarmd-intelligence/*.test.mjs; do
 node --conditions=react-server --test "$intelligence_test"
done
