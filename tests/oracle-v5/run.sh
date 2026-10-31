#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build261=$(mktemp -d /tmp/oracle261-build-XXXXXX)
trap 'rm -rf "$build261"' EXIT
./node_modules/.bin/tsc next-env.d.ts app/lens/ca-view.tsx app/lens/decision-brief.ts app/api/v4/ca-intelligence/route.ts lib/v4-oracle/onchain/*.ts lib/v4-oracle/native-mint/*.ts lib/v4-oracle/holders/*.ts lib/v4-owner-preview/*.ts lib/v4-owner-ledger/*.ts lib/v4-owner-thesis/*.ts lib/v4-private-journal/*.ts lib/v4-thesis-api/*.ts lib/v4-ca-intelligence/*.ts lib/onchain-mint/server/native-transport.ts tests/oracle-v5/browser-entry.tsx --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build261"
mkdir -p "$build261/ops/v4-journal"
ln -s "$PWD/ops/v4-journal/native-tls.mjs" "$build261/ops/v4-journal/native-tls.mjs"
ln -s "$PWD/ops/v4-journal/envelope.mjs" "$build261/ops/v4-journal/envelope.mjs"
export ORACLE_NATIVE_BUILD="$build261" HOLDER_BUILD="$build261" JOURNAL_BUILD="$build261" V4_CA_BUILD="$build261"
export ORACLE_LENS_BUILD="$build261" ORACLE_ONCHAIN_BUILD="$build261" ORACLE_V5_BUILD="$build261" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
if [[ "${1:-}" == peers ]];then
 node --conditions=react-server --test --test-concurrency=1 tests/oracle-native-259/producer.test.mjs tests/oracle-native-259/operations.test.mjs tests/oracle-native-259/security.test.mjs tests/oracle-holders-260/evidence.test.mjs tests/oracle-holders-260/security.test.mjs
elif [[ "${1:-}" == browser ]];then
 node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/oracle-v5/playwright.config.mjs
elif [[ "${1:-}" == artifact ]];then
 node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/oracle-v5/artifact.config.mjs
else
 node --conditions=react-server --test tests/oracle-lens/model.test.mjs tests/oracle-lens/integration.test.mjs tests/oracle-v5/decision.test.mjs tests/oracle-v5/gate.test.mjs tests/oracle-v5/qualification.test.mjs
fi
