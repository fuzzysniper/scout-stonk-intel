#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build=$(mktemp -d /tmp/oracle252-XXXXXX)
trap 'rm -rf "$build"' EXIT
./node_modules/.bin/tsc lib/v4-oracle/onchain/*.ts lib/onchain-mint/server/native-transport.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build"
export ORACLE_ONCHAIN_BUILD="$build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
node --conditions=react-server --test --test-concurrency=1 tests/v4-oracle-onchain/*.test.mjs
