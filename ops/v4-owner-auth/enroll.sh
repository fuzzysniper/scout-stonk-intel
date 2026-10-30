#!/usr/bin/env bash
# Compile locally; NO SQL/secret access or activation by this script. Enroll entry defaults OFF.
set -euo pipefail
cd "$(dirname "$0")/../.."
build=$(mktemp -d /tmp/owner243-enroll-XXXXXX)
trap 'rm -rf "$build"' EXIT
./node_modules/.bin/tsc next-env.d.ts ops/v4-owner-auth/enroll.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build"
mkdir -p "$build/ops/v4-journal"
ln -s "$PWD/ops/v4-journal/native-tls.mjs" "$build/ops/v4-journal/native-tls.mjs"
ln -s "$PWD/ops/v4-journal/envelope.mjs" "$build/ops/v4-journal/envelope.mjs"
NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" node --conditions=react-server "$build/ops/v4-owner-auth/enroll.js" "$@"
