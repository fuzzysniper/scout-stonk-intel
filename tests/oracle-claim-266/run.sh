#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
claim_build=$(mktemp -d /tmp/oracle-claim-XXXXXXXX)
trap 'rm -rf "$claim_build"' EXIT
./node_modules/.bin/tsc next-env.d.ts app/lens/ca-view.tsx app/api/v4/ca-intelligence/route.ts app/api/v4/ca-intelligence/compose-oracle.ts app/api/v4/native-mint/route.ts app/api/v4/native-owner/'[...all]'/route.ts lib/v4-oracle/onchain/*.ts lib/v4-oracle/mount/*.ts lib/v4-oracle/native-mint/*.ts lib/v4-oracle/holders/*.ts lib/v4-owner-preview/*.ts lib/v4-owner-ledger/*.ts lib/v4-owner-thesis/*.ts lib/v4-private-journal/*.ts lib/v4-thesis-api/*.ts lib/v4-ca-intelligence/*.ts lib/onchain-mint/server/native-transport.ts tests/oracle-claim-266/browser-entry.tsx --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$claim_build"
mkdir -p "$claim_build/ops/v4-journal"
ln -s "$PWD/ops/v4-journal/native-tls.mjs" "$claim_build/ops/v4-journal/native-tls.mjs"
ln -s "$PWD/ops/v4-journal/envelope.mjs" "$claim_build/ops/v4-journal/envelope.mjs"
export ORACLE_CLAIM_BUILD="$claim_build" ORACLE_LENS_BUILD="$claim_build" ORACLE_ONCHAIN_BUILD="$claim_build" ORACLE_NATIVE_BUILD="$claim_build" HOLDER_BUILD="$claim_build" JOURNAL_BUILD="$claim_build" V4_CA_BUILD="$claim_build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
case "${1:-}" in
 browser) node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/oracle-claim-266/playwright.config.mjs;;
 *) node --conditions=react-server --test tests/oracle-claim-266/admission.test.mjs tests/oracle-claim-266/claims.test.mjs;;
esac
