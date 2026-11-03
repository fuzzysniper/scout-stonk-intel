#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
native_build=$(mktemp -d /tmp/native-lens-XXXXXXXX)
trap 'rm -rf "$native_build"' EXIT
./node_modules/.bin/tsc next-env.d.ts app/lens/native-lens.tsx app/lens/page.tsx app/api/native-pilot/route.ts lib/native-evidence/*.ts lib/native-lens/boundary.ts tests/native-lens/browser-entry.tsx --allowJs --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$native_build"
# B's actual native ledger depends on original ESM primitives; preserve their paths.
mkdir -p "$native_build/experiments/jupiter-beta-approval/integration/durable" "$native_build/ops/v4-journal"
cp experiments/jupiter-beta-approval/protocol.mjs "$native_build/experiments/jupiter-beta-approval/"
cp experiments/jupiter-beta-approval/integration/json.mjs "$native_build/experiments/jupiter-beta-approval/integration/"
cp experiments/jupiter-beta-approval/integration/durable/anchor.mjs "$native_build/experiments/jupiter-beta-approval/integration/durable/"
cp ops/v4-journal/native-tls.mjs "$native_build/ops/v4-journal/"
ln -s "$PWD/node_modules" "$native_build/node_modules"
export NATIVE_BUILD="$native_build"
export NATIVE_LENS_BUILD="$native_build" NODE_PATH="$PWD/node_modules:$PWD/node_modules/next/dist/compiled" NODE_ENV=test
if [[ "${1:-}" == browser ]]; then
 node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/native-lens/browser.config.mjs
else
 node --conditions=react-server tests/native-lens/schema.test.mjs
 node --conditions=react-server tests/native-lens/engine-integration.test.mjs
 node --conditions=react-server tests/native-lens/off.test.mjs
 node --conditions=react-server tests/native-lens/ab-integration.test.mjs
fi
