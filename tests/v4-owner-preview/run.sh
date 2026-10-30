#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build=$(mktemp -d /tmp/owner243-build-XXXXXX)
trap 'rm -rf "$build"' EXIT
./node_modules/.bin/tsc next-env.d.ts app/lens/ca-view.tsx tests/v4-owner-preview/browser-entry.tsx --jsx react-jsx lib/v4-ca-intelligence/*.ts lib/v4-owner-preview/*.ts lib/v4-owner-ledger/*.ts lib/v4-owner-thesis/*.ts lib/v4-private-journal/*.ts lib/v4-thesis-api/*.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build"
mkdir -p "$build/ops/v4-journal"
ln -s "$PWD/ops/v4-journal/native-tls.mjs" "$build/ops/v4-journal/native-tls.mjs"
ln -s "$PWD/ops/v4-journal/envelope.mjs" "$build/ops/v4-journal/envelope.mjs"
export JOURNAL_BUILD="$build" V4_OWNER_BUILD="$build" V4_CA_BUILD="$build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
if [[ "${1:-}" == browser ]]; then
 node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/v4-owner-preview/playwright.config.mjs
else
 node --conditions=react-server --test --test-concurrency=1 tests/v4-owner-preview/*.test.mjs
fi
