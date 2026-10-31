#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
regression265_build=$(mktemp -d /tmp/oracle265-tests-XXXXXX)
trap 'rm -rf "$regression265_build"' EXIT
./node_modules/.bin/tsc app/api/v4/ca-intelligence/route.ts app/api/v4/ca-intelligence/compose-oracle.ts app/lens/intelligence-model.ts app/lens/inspect-errors.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$regression265_build"
export ORACLE_265_BUILD="$regression265_build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
if [[ "${1:-}" == artifact ]]; then
 node --conditions=react-server tests/oracle-regression-265/artifact.mjs
else
 node --conditions=react-server --test --test-concurrency=1 tests/oracle-regression-265/*.test.mjs
fi
