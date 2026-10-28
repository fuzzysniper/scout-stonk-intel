#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
node --test tests/lens/security.test.mjs
lens_build=$(mktemp -d /tmp/unfarmd-lens214-XXXXXX)
trap 'rm -rf "$lens_build"' EXIT
./node_modules/.bin/tsc next-env.d.ts app/lens/cards.tsx --jsx react-jsx --target ES2023 --module commonjs --strict --skipLibCheck --rootDir . --outDir "$lens_build"
cp app/lens/lens.module.css "$lens_build/app/lens/lens.module.css"
NODE_PATH="$PWD/node_modules" LENS_TEST_BUILD="$lens_build" node tests/lens/cards.test.mjs
