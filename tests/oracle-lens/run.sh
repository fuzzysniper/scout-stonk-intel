#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build=$(mktemp -d /tmp/oracle254-build-XXXXXX)
trap 'rm -rf "$build"' EXIT
./node_modules/.bin/tsc next-env.d.ts app/lens/ca-view.tsx app/api/v4/ca-intelligence/route.ts lib/v4-oracle/onchain/*.ts lib/onchain-mint/server/native-transport.ts tests/oracle-lens/browser-entry.tsx --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build"
export ORACLE_LENS_BUILD="$build" ORACLE_ONCHAIN_BUILD="$build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
if [[ "${1:-}" == browser ]];then
 node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/oracle-lens/playwright.config.mjs
elif [[ "${1:-}" == artifact ]];then
 node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/oracle-lens/artifact.config.mjs
else
 node --conditions=react-server --test tests/oracle-lens/model.test.mjs tests/oracle-lens/integration.test.mjs
fi
