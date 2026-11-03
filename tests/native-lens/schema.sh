#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
native_build=$(mktemp -d /tmp/native-lens-schema-XXXXXXXX)
trap 'rm -rf "$native_build"' EXIT
./node_modules/.bin/tsc next-env.d.ts app/lens/native-lens.tsx app/lens/page.tsx app/api/native-pilot/route.ts --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$native_build"
export NATIVE_LENS_BUILD="$native_build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
node --conditions=react-server tests/native-lens/schema.test.mjs
node --conditions=react-server tests/native-lens/off.test.mjs
