#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build266=$(mktemp -d /tmp/oracle266-build-XXXXXX)
trap 'rm -rf "$build266"' EXIT
./node_modules/.bin/tsc next-env.d.ts app/lens/ca-view.tsx app/api/v4/ca-intelligence/route.ts app/api/v4/ca-intelligence/compose-oracle.ts app/api/v4/native-mint/route.ts app/api/v4/native-owner/'[...all]'/route.ts lib/v4-oracle/onchain/*.ts lib/v4-oracle/mount/*.ts lib/v4-oracle/native-mint/*.ts lib/v4-oracle/holders/*.ts lib/v4-owner-preview/*.ts lib/v4-owner-ledger/*.ts lib/v4-owner-thesis/*.ts lib/v4-private-journal/*.ts lib/v4-thesis-api/*.ts lib/v4-ca-intelligence/*.ts lib/onchain-mint/server/native-transport.ts tests/oracle-mount-266/browser-entry.tsx --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build266"
mkdir -p "$build266/ops/v4-journal"
ln -s "$PWD/ops/v4-journal/native-tls.mjs" "$build266/ops/v4-journal/native-tls.mjs"
ln -s "$PWD/ops/v4-journal/envelope.mjs" "$build266/ops/v4-journal/envelope.mjs"
export ORACLE_266_BUILD="$build266" ORACLE_LENS_BUILD="$build266" ORACLE_NATIVE_BUILD="$build266" ORACLE_ONCHAIN_BUILD="$build266" HOLDER_BUILD="$build266" JOURNAL_BUILD="$build266" V4_CA_BUILD="$build266" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
case "${1:-}" in
 browser) node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/oracle-mount-266/playwright.config.mjs;;
 peers) node --conditions=react-server --test --test-concurrency=1 tests/oracle-native-259/producer.test.mjs tests/oracle-native-259/operations.test.mjs tests/oracle-native-259/security.test.mjs tests/oracle-holders-260/evidence.test.mjs tests/oracle-holders-260/security.test.mjs;;
 artifact) node --conditions=react-server tests/oracle-mount-266/artifact.mjs;;
 *) node --conditions=react-server --test --test-concurrency=1 tests/oracle-mount-266/admission.test.mjs tests/oracle-mount-266/runtime.test.mjs tests/oracle-mount-266/client.test.mjs;;
esac
