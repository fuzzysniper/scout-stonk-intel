#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
neon_build=$(mktemp -d /tmp/v4-neon239-XXXXXX)
trap 'rm -rf "$neon_build"' EXIT
./node_modules/.bin/tsc next-env.d.ts lib/v4-owner-ledger/*.ts lib/v4-owner-thesis/*.ts lib/v4-helius-native/*.ts lib/v4-helius-pilot/server/testing.ts lib/v4-private-journal/*.ts lib/v4-thesis-api/*.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$neon_build"
mkdir -p "$neon_build/ops/v4-journal"
cp ops/v4-journal/native-tls.mjs ops/v4-journal/sources.json "$neon_build/ops/v4-journal/"
export JOURNAL_BUILD="$neon_build" V4_OWNER_BUILD="$neon_build" V4_NATIVE_BUILD="$neon_build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
node --conditions=react-server --test --test-concurrency=1 tests/v4-neon-durability/contract.test.mjs tests/v4-neon-durability/postgres18.test.mjs
# All original FUNCTIONAL tests of the affected actual-tree runtime, unchanged.
# Their immutable scope guards run separately in exact original trees; no guard is skipped.
node --conditions=react-server --test --test-concurrency=1 tests/v4-owner-ledger/security.test.mjs tests/v4-owner-ledger/native.test.mjs tests/v4-final/combined.test.mjs
