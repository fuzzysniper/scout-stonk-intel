#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc app/consumer/onchain.tsx app/consumer/onchain-model.ts tests/consumer-homepage/synthetic.ts --jsx react-jsx --target ES2023 --module commonjs --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build_dir"
NODE_PATH="$PWD/node_modules" CONSUMER_TEST_BUILD="$build_dir" node --test tests/consumer-homepage/onchain.test.mjs
