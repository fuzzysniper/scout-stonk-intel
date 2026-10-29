#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build=$(mktemp -d /tmp/v4-final-237-XXXXXX)
trap 'rm -rf "$build"' EXIT
./node_modules/.bin/tsc next-env.d.ts lib/v4-owner-thesis/*.ts lib/v4-owner-ledger/*.ts lib/v4-helius-native/*.ts lib/v4-helius-pilot/server/testing.ts lib/v4-private-journal/*.ts lib/v4-thesis-api/*.ts app/lens/view.tsx tests/v4-thesis/browser-entry.tsx --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build"
export JOURNAL_BUILD="$build" V4_OWNER_BUILD="$build" V4_NATIVE_BUILD="$build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
if [[ "${1:-}" == browser ]]; then
 node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/v4-final/playwright.config.mjs
else
 node --conditions=react-server --test --test-concurrency=1 tests/v4-final/combined.test.mjs
 bash tests/v4-journal-deployment/run.sh
fi
