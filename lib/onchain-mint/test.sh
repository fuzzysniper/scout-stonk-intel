#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc -p lib/onchain-mint/tsconfig.json --outDir "$build_dir"
export MINT_TEST_BUILD="$build_dir"
node lib/onchain-mint/tests/decoder.test.mjs
node lib/onchain-mint/tests/reader.test.mjs
