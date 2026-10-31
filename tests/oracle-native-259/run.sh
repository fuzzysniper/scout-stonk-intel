#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build259=$(mktemp -d /tmp/oracle259-build-XXXXXX)
trap 'rm -rf "$build259"' EXIT
./node_modules/.bin/tsc lib/v4-oracle/native-mint/*.ts lib/v4-oracle/onchain/*.ts lib/v4-owner-preview/*.ts lib/v4-ca-intelligence/*.ts lib/v4-owner-ledger/*.ts lib/v4-owner-thesis/*.ts lib/v4-private-journal/*.ts lib/v4-thesis-api/*.ts lib/onchain-mint/server/native-transport.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build259"
mkdir -p "$build259/ops/v4-journal"
ln -s "$PWD/ops/v4-journal/native-tls.mjs" "$build259/ops/v4-journal/native-tls.mjs"
ln -s "$PWD/ops/v4-journal/envelope.mjs" "$build259/ops/v4-journal/envelope.mjs"
export ORACLE_NATIVE_BUILD="$build259" ORACLE_ONCHAIN_BUILD="$build259" JOURNAL_BUILD="$build259" V4_CA_BUILD="$build259" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
node --conditions=react-server --test --test-concurrency=1 tests/oracle-native-259/*.test.mjs
