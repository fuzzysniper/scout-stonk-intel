#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
archive_build_dir=$(mktemp -d)
trap 'rm -rf "$archive_build_dir"' EXIT
./node_modules/.bin/tsc scripts/archive-tool.ts --resolveJsonModule --target ES2023 --module commonjs --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$archive_build_dir"
NODE_PATH="$PWD/node_modules" node "$archive_build_dir/scripts/archive-tool.js" "$@"
