#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
claim_build=$(mktemp -d /tmp/oracle-claim-admission-XXXXXXXX)
trap 'rm -rf "$claim_build"' EXIT
./node_modules/.bin/tsc app/api/v4/native-mint/route.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$claim_build"
ORACLE_CLAIM_BUILD="$claim_build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test node --conditions=react-server --test tests/oracle-claim-266/admission.test.mjs
