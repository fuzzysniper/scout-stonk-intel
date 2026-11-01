#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
beta_build=$(mktemp -d /tmp/jupiter-beta-276-XXXXXXXX)
trap 'rm -rf "$beta_build"' EXIT
./node_modules/.bin/tsc next-env.d.ts app/lens/ca-view.tsx app/api/v4/ca-intelligence/route.ts app/lens/intelligence-model.ts --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$beta_build"
export JUPITER_BETA_BUILD="$beta_build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
node --conditions=react-server --test --test-concurrency=1 tests/jupiter-beta-276/admission.test.mjs tests/jupiter-beta-276/route.test.mjs
