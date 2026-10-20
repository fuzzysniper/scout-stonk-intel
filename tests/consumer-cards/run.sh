#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc app/consumer/cards/research.tsx app/consumer/cards/performance.ts app/consumer/cards/pipeline.ts --jsx react-jsx --resolveJsonModule --target ES2023 --module commonjs --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build_dir"
NODE_PATH="$PWD/node_modules" CARDS_TEST_BUILD="$build_dir" node --test tests/consumer-cards/model.test.mjs tests/consumer-cards/client.test.mjs tests/consumer-cards/pipeline.test.mjs
