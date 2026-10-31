#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build266=$(mktemp -d /tmp/source266-build-XXXXXX)
trap 'rm -rf "$build266"' EXIT
./node_modules/.bin/tsc next-env.d.ts app/lens/ca-view.tsx tests/v4-owner-preview/browser-entry.tsx --jsx react-jsx lib/v4-ca-intelligence/*.ts lib/v4-owner-preview/*.ts lib/v4-owner-ledger/*.ts lib/v4-owner-thesis/*.ts lib/v4-private-journal/*.ts lib/v4-thesis-api/*.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build266"
mkdir -p "$build266/ops/v4-journal"
ln -s "$PWD/ops/v4-journal/native-tls.mjs" "$build266/ops/v4-journal/native-tls.mjs"
ln -s "$PWD/ops/v4-journal/envelope.mjs" "$build266/ops/v4-journal/envelope.mjs"
export JOURNAL_BUILD="$build266" V4_OWNER_BUILD="$build266" V4_CA_BUILD="$build266" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
node --conditions=react-server --test --test-concurrency=1 tests/oracle-source-install-266/install.test.mjs tests/v4-owner-preview/auth.test.mjs tests/v4-owner-preview/installed.test.mjs tests/v4-owner-preview/keys.test.mjs tests/v4-owner-preview/presentation.test.mjs tests/v4-owner-preview/source.test.mjs
