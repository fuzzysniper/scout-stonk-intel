#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
pulse_build=$(mktemp -d)
trap 'rm -rf "$pulse_build"' EXIT
./node_modules/.bin/tsc lib/trader-pulse/adapter.ts app/api/trader-pulse/route.ts --target ES2022 --module commonjs --moduleResolution node --lib ES2022,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$pulse_build"
export PULSE_BUILD="$pulse_build"
export NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules"
for pulse_test in tests/trader-pulse/*.test.mjs; do
  node --conditions=react-server "$pulse_test"
done
