#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
v4_build=$(mktemp -d /tmp/unfarmd-v4-218-XXXXXX)
trap 'rm -rf "$v4_build"' EXIT
./node_modules/.bin/tsc next-env.d.ts lib/v4-alpha-lens/captured-bridge.ts lib/v4-alpha-lens/source-off-model.ts --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$v4_build"
export V4_INTEGRATION_BUILD="$v4_build"
export NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules"
node --conditions=react-server --test tests/v4-integration/bridge.test.mjs tests/v4-integration/scope.test.mjs
bash tests/lens/run.sh
