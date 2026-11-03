#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build=$(mktemp -d /tmp/native-evidence-XXXXXX)
trap 'rm -rf "$build"' EXIT
./node_modules/.bin/tsc lib/native-evidence/*.ts lib/v4-oracle/onchain/*.ts lib/v4-oracle/holders/*.ts lib/onchain-mint/server/native-transport.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build"
export ORACLE_ONCHAIN_BUILD="$build" HOLDER_BUILD="$build" NATIVE_EVIDENCE_BUILD="$build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
if [[ "${1:-}" == peers ]]; then
 node --conditions=react-server --test --test-concurrency=1 tests/v4-oracle-onchain/controls.test.mjs tests/v4-oracle-onchain/security.test.mjs tests/oracle-holders-260/evidence.test.mjs tests/oracle-holders-260/security.test.mjs
elif [[ "${1:-}" == examples ]]; then
 node --conditions=react-server tests/native-evidence/examples.mjs
else
 node --conditions=react-server --test --test-concurrency=1 tests/native-evidence/engine.test.mjs tests/native-evidence/security.test.mjs
fi
