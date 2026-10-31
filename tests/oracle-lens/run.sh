#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build=$(mktemp -d /tmp/oracle254-build-XXXXXX)
trap 'rm -rf "$build"' EXIT
./node_modules/.bin/tsc next-env.d.ts app/lens/ca-view.tsx tests/oracle-lens/browser-entry.tsx --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build"
export ORACLE_LENS_BUILD="$build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
if [[ "${1:-}" == browser ]];then
 node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/oracle-lens/playwright.config.mjs
else
 node --conditions=react-server --test tests/oracle-lens/model.test.mjs
fi
