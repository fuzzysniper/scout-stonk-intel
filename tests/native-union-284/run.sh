#!/usr/bin/env bash
# NO SQL, no root/scheduler runners; actual imported A/B/C, external egress blocked.
set -euo pipefail
cd "$(dirname "$0")/../.."
native_union_build=$(mktemp -d /tmp/native-union-284-XXXXXXXX)
trap 'rm -rf "$native_union_build"' EXIT
./node_modules/.bin/tsc next-env.d.ts app/lens/native-lens.tsx app/lens/page.tsx app/api/native-pilot/route.ts lib/native-lens/boundary.ts lib/native-evidence/*.ts tests/native-lens/browser-entry.tsx --allowJs --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$native_union_build"
mkdir -p "$native_union_build/experiments/jupiter-beta-approval/integration/durable" "$native_union_build/ops/v4-journal"
cp experiments/jupiter-beta-approval/protocol.mjs "$native_union_build/experiments/jupiter-beta-approval/"
cp experiments/jupiter-beta-approval/integration/json.mjs "$native_union_build/experiments/jupiter-beta-approval/integration/"
cp experiments/jupiter-beta-approval/integration/durable/anchor.mjs "$native_union_build/experiments/jupiter-beta-approval/integration/durable/"
cp ops/v4-journal/native-tls.mjs "$native_union_build/ops/v4-journal/"
ln -s "$PWD/node_modules" "$native_union_build/node_modules"
export NATIVE_BUILD="$native_union_build" NATIVE_LENS_BUILD="$native_union_build" NODE_PATH="$PWD/node_modules:$PWD/node_modules/next/dist/compiled" NODE_ENV=test
if [[ "${1:-}" == browser ]]; then
 node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/native-union-284/browser.config.mjs "${@:2}"
else
 node --conditions=react-server tests/native-lens/schema.test.mjs
 node --conditions=react-server tests/native-lens/engine-integration.test.mjs
 node --conditions=react-server tests/native-lens/off.test.mjs
 node --conditions=react-server tests/native-union-284/off.test.mjs
 node --conditions=react-server tests/native-union-284/state-machine.test.mjs
fi
