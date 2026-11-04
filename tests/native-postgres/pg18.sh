#!/usr/bin/env bash
# Existing owner approval is scoped to this isolated synthetic native-only suite.
set -euo pipefail
cd "$(dirname "$0")/../.."
node --input-type=module -e "import {requireLocalPg18Approval} from './tests/native-postgres/pg18-approval.mjs'; requireLocalPg18Approval();"
pg18_build=$(mktemp -d /tmp/native-pg18-approved-XXXXXXXX)
trap 'rm -rf "$pg18_build"' EXIT
./node_modules/.bin/tsc lib/native-pilot/postgres/*.ts --allowJs --target ES2023 --module commonjs --moduleResolution node --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$pg18_build"
mkdir -p "$pg18_build/experiments/jupiter-beta-approval/integration/durable" "$pg18_build/experiments/jupiter-beta-approval/integration/services" "$pg18_build/ops/v4-journal"
cp experiments/jupiter-beta-approval/protocol.mjs "$pg18_build/experiments/jupiter-beta-approval/"
cp experiments/jupiter-beta-approval/integration/json.mjs "$pg18_build/experiments/jupiter-beta-approval/integration/"
cp experiments/jupiter-beta-approval/integration/durable/anchor.mjs "$pg18_build/experiments/jupiter-beta-approval/integration/durable/"
cp experiments/jupiter-beta-approval/integration/services/{auth,peers}.mjs "$pg18_build/experiments/jupiter-beta-approval/integration/services/"
cp ops/v4-journal/{native-tls.mjs,sources.json} "$pg18_build/ops/v4-journal/"
ln -s "$PWD/node_modules" "$pg18_build/node_modules"
export REMOTE_BUILD="$pg18_build" NATIVE_BUILD="$pg18_build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
# SQL guard intentionally absent ONLY inside the owner-approved OS namespace.
export NODE_OPTIONS="--import=$PWD/tests/native-postgres/namespace-only.mjs --import=$PWD/tests/security114/local-only.mjs"
node --conditions=react-server tests/native-postgres/pg18.test.mjs

node --test tests/v4-journal-deployment/protocol.test.mjs
