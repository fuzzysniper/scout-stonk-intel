#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build=$(mktemp -d /tmp/farm253-build-XXXXXX)
trap 'rm -rf "$build"' EXIT
./node_modules/.bin/tsc lib/v4-oracle/farming/*.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --rootDir . --outDir "$build"
export FARM_BUILD="$build"
node --test tests/v4-oracle-farming/*.test.mjs
