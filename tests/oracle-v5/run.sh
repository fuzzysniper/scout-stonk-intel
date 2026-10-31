#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build261=$(mktemp -d /tmp/oracle261-build-XXXXXX)
trap 'rm -rf "$build261"' EXIT
./node_modules/.bin/tsc next-env.d.ts app/lens/ca-view.tsx app/lens/decision-brief.ts app/api/v4/ca-intelligence/route.ts lib/v4-oracle/onchain/*.ts lib/onchain-mint/server/native-transport.ts tests/oracle-lens/browser-entry.tsx --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build261"
export ORACLE_LENS_BUILD="$build261" ORACLE_ONCHAIN_BUILD="$build261" ORACLE_V5_BUILD="$build261" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
if [[ "${1:-}" == browser ]];then
 node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/oracle-v5/playwright.config.mjs
elif [[ "${1:-}" == artifact ]];then
 node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/oracle-v5/artifact.config.mjs
else
 node --conditions=react-server --test tests/oracle-lens/model.test.mjs tests/oracle-lens/integration.test.mjs tests/oracle-v5/decision.test.mjs tests/oracle-v5/gate.test.mjs
fi
