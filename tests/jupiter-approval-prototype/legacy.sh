#!/usr/bin/env bash
# Compile original277 verifiers unchanged; only synthetic test signatures, no SQL.
set -euo pipefail
cd "$(dirname "$0")/../.."
build_proto277=$(mktemp -d /tmp/jupiter-prototype-legacy-XXXXXXXX)
trap 'rm -rf "$build_proto277"' EXIT
./node_modules/.bin/tsc next-env.d.ts lib/v4-ca-intelligence/jupiter-beta-admission.ts app/lens/jupiter-beta-approval.ts --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build_proto277"
export JUPITER_BETA_BUILD="$build_proto277" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
node --conditions=react-server --test tests/jupiter-approval-prototype/legacy-isolation.test.mjs
