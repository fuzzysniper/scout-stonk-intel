#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc lib/unfarmd-evidence/index.ts --target ES2020 --module commonjs --strict --skipLibCheck --rootDir . --outDir "$build_dir"
UNFARMD_EVIDENCE_BUILD="$build_dir" node --test tests/unfarmd-evidence/*.test.mjs
