#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc experiments/continuous-stream/controller.ts --target ES2023 --module commonjs --strict --skipLibCheck --resolveJsonModule --esModuleInterop --rootDir . --outDir "$build_dir"
CONTINUOUS_BUILD="$build_dir/experiments/continuous-stream" LIVE_STREAM_BUILD="$build_dir/experiments/live-stream" node --test experiments/continuous-stream/tests/*.test.mjs
