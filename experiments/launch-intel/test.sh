#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc experiments/launch-intel/pipeline.ts experiments/launch-intel/fixtures.ts --target ES2023 --module commonjs --strict --skipLibCheck --resolveJsonModule --esModuleInterop --rootDir . --outDir "$build_dir"
LAUNCH_INTEL_BUILD="$build_dir/experiments/launch-intel" node --test experiments/launch-intel/tests/*.test.mjs
