#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
if [[ $# != 0 ]]; then echo 'Built-in synthetic offline demo only; no arguments.' >&2; exit 1; fi
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc experiments/agent-zero-market/demo.ts --target ES2022 --module commonjs --moduleResolution node --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build_dir"
node "$build_dir/experiments/agent-zero-market/demo.js"
