#!/usr/bin/env bash
# B's ORIGINAL executable tests on the combined tree, no SQL. Its finite scope
# test is intentionally run UNCHANGED on B's original immutable head by replay.sh.
set -euo pipefail
cd "$(dirname "$0")/../.."
native_build=$(mktemp -d /tmp/native-lens-b-XXXXXXXX)
trap 'rm -rf "$native_build"' EXIT
./node_modules/.bin/tsc lib/native-pilot/index.ts --allowJs --target ES2023 --module commonjs --moduleResolution node --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$native_build"
mkdir -p "$native_build/experiments/jupiter-beta-approval/integration/durable" "$native_build/ops/v4-journal"
cp experiments/jupiter-beta-approval/protocol.mjs "$native_build/experiments/jupiter-beta-approval/"
cp experiments/jupiter-beta-approval/integration/json.mjs "$native_build/experiments/jupiter-beta-approval/integration/"
cp experiments/jupiter-beta-approval/integration/durable/anchor.mjs "$native_build/experiments/jupiter-beta-approval/integration/durable/"
cp ops/v4-journal/native-tls.mjs "$native_build/ops/v4-journal/"
ln -s "$PWD/node_modules" "$native_build/node_modules"
export NATIVE_BUILD="$native_build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules"
for native_case in auth engine ledger plan transport; do
 node --conditions=react-server "tests/native-pilot/$native_case.test.mjs"
done
