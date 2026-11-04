#!/usr/bin/env bash
# Explicit command allowlist only. No blanket root, Python discovery, PG or scheduler execution.
set -euo pipefail
cd "$(dirname "$0")/../.."
remote_build=$(mktemp -d /tmp/native-postgres-build-XXXXXXXX)
trap 'rm -rf "$remote_build"' EXIT
./node_modules/.bin/tsc lib/native-pilot/index.ts lib/native-pilot/postgres/*.ts --allowJs --target ES2023 --module commonjs --moduleResolution node --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$remote_build"
mkdir -p "$remote_build/experiments/jupiter-beta-approval/integration/durable" "$remote_build/experiments/jupiter-beta-approval/integration/services" "$remote_build/ops/v4-journal"
cp experiments/jupiter-beta-approval/protocol.mjs "$remote_build/experiments/jupiter-beta-approval/"
cp experiments/jupiter-beta-approval/integration/json.mjs "$remote_build/experiments/jupiter-beta-approval/integration/"
cp experiments/jupiter-beta-approval/integration/durable/anchor.mjs "$remote_build/experiments/jupiter-beta-approval/integration/durable/"
cp experiments/jupiter-beta-approval/integration/services/{auth,peers}.mjs "$remote_build/experiments/jupiter-beta-approval/integration/services/"
cp ops/v4-journal/{native-tls.mjs,sources.json} "$remote_build/ops/v4-journal/"
ln -s "$PWD/node_modules" "$remote_build/node_modules"
export REMOTE_BUILD="$remote_build" NATIVE_BUILD="$remote_build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules"
export NODE_OPTIONS="--import=$PWD/tests/security114/local-only.mjs --import=$PWD/tests/native-postgres/no-database.mjs"
for remote_case in tests/native-postgres/non-sql/*.test.mjs; do node --conditions=react-server "$remote_case"; done
