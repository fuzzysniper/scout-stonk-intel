#!/usr/bin/env bash
# Relevant C integration regression under B's EXISTING owner-approved SQL scope.
# Approval + B's namespace proof precede compilation and every cluster/SQL action.
set -euo pipefail
cd "$(dirname "$0")/../.."
node --input-type=module -e "import {requireLocalPg18Approval} from './tests/native-postgres/pg18-approval.mjs'; requireLocalPg18Approval(); await import('./tests/native-postgres/namespace-only.mjs');"
current_pg_build=$(mktemp -d /tmp/current-native-union-pg-XXXXXXXX)
trap 'rm -rf "$current_pg_build"' EXIT
./node_modules/.bin/tsc next-env.d.ts lib/native-pilot/postgres/*.ts lib/native-pilot/index.ts lib/native-evidence/*.ts lib/native-lens/boundary.ts app/lens/native-lens.tsx tests/native-lens/browser-entry.tsx --jsx react-jsx --lib ES2023,DOM --allowJs --target ES2023 --module commonjs --moduleResolution node --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$current_pg_build"
mkdir -p "$current_pg_build/experiments/jupiter-beta-approval/integration/durable" "$current_pg_build/experiments/jupiter-beta-approval/integration/services" "$current_pg_build/ops/v4-journal"
cp experiments/jupiter-beta-approval/protocol.mjs "$current_pg_build/experiments/jupiter-beta-approval/"
cp experiments/jupiter-beta-approval/integration/json.mjs "$current_pg_build/experiments/jupiter-beta-approval/integration/"
cp experiments/jupiter-beta-approval/integration/durable/anchor.mjs "$current_pg_build/experiments/jupiter-beta-approval/integration/durable/"
cp experiments/jupiter-beta-approval/integration/services/{auth,peers}.mjs "$current_pg_build/experiments/jupiter-beta-approval/integration/services/"
cp ops/v4-journal/{native-tls.mjs,sources.json} "$current_pg_build/ops/v4-journal/"
ln -s "$PWD/node_modules" "$current_pg_build/node_modules"
export REMOTE_BUILD="$current_pg_build" NATIVE_BUILD="$current_pg_build" NATIVE_LENS_BUILD="$current_pg_build" NODE_PATH="$PWD/node_modules:$PWD/node_modules/next/dist/compiled" NODE_ENV=test
export NODE_OPTIONS="--import=$PWD/tests/native-postgres/namespace-only.mjs --import=$PWD/tests/security114/local-only.mjs"
node --conditions=react-server tests/native-union-284/pg18.test.mjs
