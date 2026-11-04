#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build=$(mktemp -d /tmp/helius-intake-XXXXXX)
trap 'rm -rf "$build"' EXIT
./node_modules/.bin/tsc lib/native-evidence/*.ts lib/native-pilot/index.ts app/lens/native-evidence-model.ts tests/helius-intake/types.ts --allowJs --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build"
mkdir -p "$build/experiments/jupiter-beta-approval/integration/durable" "$build/ops/v4-journal"
cp experiments/jupiter-beta-approval/protocol.mjs "$build/experiments/jupiter-beta-approval/"
cp experiments/jupiter-beta-approval/integration/json.mjs "$build/experiments/jupiter-beta-approval/integration/"
cp experiments/jupiter-beta-approval/integration/durable/anchor.mjs "$build/experiments/jupiter-beta-approval/integration/durable/"
cp ops/v4-journal/native-tls.mjs "$build/ops/v4-journal/"
ln -s "$PWD/node_modules" "$build/node_modules"
export NATIVE_BUILD="$build" NATIVE_EVIDENCE_BUILD="$build" HELIUS_INTAKE_BUILD="$build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
if [[ "${1:-}" == examples ]]; then
 node --conditions=react-server tests/helius-intake/examples.mjs
else
 node --conditions=react-server --test --test-concurrency=1 tests/helius-intake/intake.test.mjs
fi
