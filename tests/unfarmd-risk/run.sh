#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
risk_build=$(mktemp -d /tmp/unfarmd-risk-test-XXXXXX)
trap 'rm -rf "$risk_build"' EXIT
./node_modules/.bin/tsc lib/unfarmd-risk/index.ts --target ES2023 --module commonjs --strict --skipLibCheck --rootDir . --outDir "$risk_build"
UNFARMD_RISK_TEST_BUILD="$risk_build" node --test tests/unfarmd-risk/*.test.mjs
