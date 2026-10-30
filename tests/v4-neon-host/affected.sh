#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
local_build=$(mktemp -d /tmp/v4-neon241-XXXXXX)
trap 'rm -rf "$local_build"' EXIT
./node_modules/.bin/tsc next-env.d.ts lib/v4-owner-ledger/*.ts lib/v4-owner-thesis/*.ts lib/v4-helius-native/*.ts lib/v4-helius-pilot/server/testing.ts lib/v4-private-journal/*.ts lib/v4-thesis-api/*.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$local_build"
mkdir -p "$local_build/ops/v4-journal"
cp ops/v4-journal/native-tls.mjs ops/v4-journal/sources.json "$local_build/ops/v4-journal/"
export JOURNAL_BUILD="$local_build" V4_OWNER_BUILD="$local_build" V4_NATIVE_BUILD="$local_build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
node --conditions=react-server --test --test-concurrency=1 tests/v4-neon-host/host.test.mjs tests/v4-neon-host/postgres.test.mjs tests/v4-neon-durability/contract.test.mjs tests/v4-neon-durability/postgres18.test.mjs
node --conditions=react-server --test --test-concurrency=1 tests/v4-owner-ledger/security.test.mjs tests/v4-owner-ledger/native.test.mjs tests/v4-final/combined.test.mjs tests/v4-journal-deployment/operations.test.mjs tests/v4-journal-deployment/native.test.mjs tests/v4-journal-deployment/protocol.test.mjs
