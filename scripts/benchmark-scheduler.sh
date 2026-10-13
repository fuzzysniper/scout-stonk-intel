#!/usr/bin/env bash
# Offline Linux harness; no Cloudflare CLI, account, key or network activation.
set -euo pipefail
cd "$(dirname "$0")/.."
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc scheduler/worker.ts --target ES2022 --module esnext --moduleResolution bundler --lib ES2022,DOM --strict --skipLibCheck --outDir "$build_dir"
SCHEDULER_TEST_BUILD="$build_dir" node scripts/benchmark-scheduler.mjs "${1:-/tmp/scout-scheduler-cpu.json}"
