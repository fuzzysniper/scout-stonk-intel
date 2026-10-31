#!/usr/bin/env bash
# Current unchanged source parser/engine/security behavior. Historical scope manifests are never waived.
set -euo pipefail
cd "$(dirname "$0")/../.."
build=$(mktemp -d /tmp/oracle254-source-XXXXXX)
trap 'rm -rf "$build"' EXIT
./node_modules/.bin/tsc lib/v4-ca-intelligence/*.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build"
export V4_CA_BUILD="$build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
node --conditions=react-server --test --test-concurrency=1 tests/v4-ca-intelligence/engine.test.mjs tests/v4-ca-intelligence/market.test.mjs tests/v4-ca-intelligence/security.test.mjs
