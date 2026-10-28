#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
node --test tests/v3-release/scope.test.mjs
node --test tests/v3-release/lifecycle.test.mjs tests/v3-release/github-proof.test.mjs
node --test tests/v3-release/audit.test.mjs
bash tests/unfarmd-source-selection/run.sh
bash tests/unfarmd-journal/run.sh
release_build=$(mktemp -d /tmp/unfarmd-v3-link-XXXXXX)
trap 'rm -rf "$release_build"' EXIT
./node_modules/.bin/tsc tests/v3-release/link-fixtures.ts --target ES2023 --module commonjs --strict --skipLibCheck --rootDir . --outDir "$release_build"
UNFARMD_V3_LINK_BUILD="$release_build" node --test tests/v3-release/link.test.mjs
