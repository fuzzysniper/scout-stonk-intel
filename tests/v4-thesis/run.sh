#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
thesis_build=$(mktemp -d /tmp/unfarmd-thesis228-XXXXXX)
trap 'rm -rf "$thesis_build"' EXIT
./node_modules/.bin/tsc next-env.d.ts lib/v4-thesis-api/*.ts lib/v4-private-journal/index.ts app/lens/view.tsx tests/v4-thesis/browser-entry.tsx --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$thesis_build"
export JOURNAL_BUILD="$thesis_build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
if [[ "${1:-}" == browser ]];then
 node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/v4-thesis/playwright.config.mjs
else
 node --conditions=react-server --test tests/v4-thesis/api.test.mjs
fi
