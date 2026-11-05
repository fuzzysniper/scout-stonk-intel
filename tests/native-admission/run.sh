#!/usr/bin/env bash
# Explicit non-SQL command allowlist. No approval publication or hosted/provider calls.
set -euo pipefail
cd "$(dirname "$0")/../.."
admission_build=$(mktemp -d /tmp/native-admission-build-XXXXXXXX)
trap 'rm -rf "$admission_build"' EXIT
./node_modules/.bin/tsc lib/native-pilot/admission/*.ts lib/native-pilot/index.ts lib/native-pilot/postgres/*.ts lib/native-lens/boundary.ts app/api/native-pilot/route.ts lib/v4-owner-ledger/neon-durability.ts --allowJs --target ES2023 --module commonjs --moduleResolution node --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$admission_build"
mkdir -p "$admission_build/experiments/jupiter-beta-approval/integration/durable" "$admission_build/experiments/jupiter-beta-approval/integration/services" "$admission_build/ops/v4-journal"
cp experiments/jupiter-beta-approval/protocol.mjs "$admission_build/experiments/jupiter-beta-approval/"
cp experiments/jupiter-beta-approval/integration/json.mjs "$admission_build/experiments/jupiter-beta-approval/integration/"
cp experiments/jupiter-beta-approval/integration/durable/anchor.mjs "$admission_build/experiments/jupiter-beta-approval/integration/durable/"
cp experiments/jupiter-beta-approval/integration/services/{auth,peers}.mjs "$admission_build/experiments/jupiter-beta-approval/integration/services/"
cp ops/v4-journal/{native-tls.mjs,sources.json} "$admission_build/ops/v4-journal/"
ln -s "$PWD/node_modules" "$admission_build/node_modules"
export ADMISSION_BUILD="$admission_build" REMOTE_BUILD="$admission_build" NATIVE_BUILD="$admission_build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
export NODE_OPTIONS="--import=$PWD/tests/security114/local-only.mjs --import=$PWD/tests/native-postgres/no-database.mjs"
for admission_case in tests/native-admission/*.test.mjs; do
 if [[ "$admission_case" != *scope.test.mjs ]]; then node --conditions=react-server "$admission_case"; fi
done
