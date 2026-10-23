#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc experiments/live-stream/worker.ts --target ES2023 --module commonjs --strict --skipLibCheck --resolveJsonModule --esModuleInterop --rootDir . --outDir "$build_dir"
LIVE_STREAM_BUILD="$build_dir/experiments/live-stream" node --test experiments/live-stream/tests/*.test.mjs
