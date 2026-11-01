#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
take_build=$(mktemp -d /tmp/oracle-take-XXXXXXXX)
trap 'rm -rf "$take_build"' EXIT
./node_modules/.bin/tsc next-env.d.ts app/lens/ca-view.tsx app/api/v4/ca-intelligence/route.ts app/api/v4/ca-intelligence/compose-oracle.ts app/api/v4/native-mint/route.ts app/api/v4/native-owner/'[...all]'/route.ts lib/v4-oracle/onchain/*.ts lib/v4-oracle/mount/*.ts lib/v4-oracle/native-mint/*.ts lib/v4-oracle/holders/*.ts lib/v4-owner-preview/*.ts lib/v4-owner-ledger/*.ts lib/v4-owner-thesis/*.ts lib/v4-private-journal/*.ts lib/v4-thesis-api/*.ts lib/v4-ca-intelligence/*.ts lib/onchain-mint/server/native-transport.ts tests/oracle-take-274/browser-entry.tsx --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$take_build"
mkdir -p "$take_build/ops/v4-journal"
ln -s "$PWD/ops/v4-journal/native-tls.mjs" "$take_build/ops/v4-journal/native-tls.mjs"
ln -s "$PWD/ops/v4-journal/envelope.mjs" "$take_build/ops/v4-journal/envelope.mjs"
export ORACLE_TAKE_BUILD="$take_build" ORACLE_CLAIM_BUILD="$take_build" ORACLE_LENS_BUILD="$take_build" ORACLE_ONCHAIN_BUILD="$take_build" ORACLE_NATIVE_BUILD="$take_build" HOLDER_BUILD="$take_build" JOURNAL_BUILD="$take_build" V4_CA_BUILD="$take_build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
case "${1:-}" in
 browser) node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/oracle-take-274/playwright.config.mjs;;
 optimized) node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/oracle-take-274/optimized.config.mjs;;
 *) node --conditions=react-server --test tests/oracle-take-274/model.test.mjs tests/oracle-claim-266/claims.test.mjs;;
esac
