#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
brand_build=$(mktemp -d)
trap 'rm -rf "$brand_build"' EXIT
./node_modules/.bin/tsc experiments/unfarmd-brand/model.ts --target ES2022 --module commonjs --strict --skipLibCheck --rootDir . --outDir "$brand_build"
UNFARMD_TEST_BUILD="$brand_build" node --test experiments/unfarmd-brand/test/model.test.mjs
