#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
held260_build=$(mktemp -d /tmp/holders260-build-XXXXXX)
trap 'rm -rf "$held260_build"' EXIT
./node_modules/.bin/tsc lib/v4-oracle/holders/*.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$held260_build"
export HOLDER_BUILD="$held260_build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
node --conditions=react-server --test --test-concurrency=1 tests/oracle-holders-260/*.test.mjs
