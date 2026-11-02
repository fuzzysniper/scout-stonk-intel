#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
v3_build=$(mktemp -d /tmp/jupiter-research-v3-XXXXXXXX)
trap 'rm -rf "$v3_build"' EXIT
./node_modules/.bin/tsc next-env.d.ts app/lens/ca-view.tsx app/api/v4/ca-intelligence/route.ts --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$v3_build"
export RESEARCH_BUILD="$v3_build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=development
for v3_case in public request platform route; do
 node --conditions=react-server "tests/jupiter-research-v3/$v3_case.test.mjs"
done
