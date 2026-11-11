#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
desk_build=$(mktemp -d /tmp/unfarmd-desk-build-XXXXXX)
trap 'rm -rf "$desk_build"' EXIT
./node_modules/.bin/tsc app/desk/integration/model.ts --target ES2023 --module commonjs --strict --skipLibCheck --rootDir . --outDir "$desk_build"
DESK_INTEGRATION_BUILD="$desk_build" node --test tests/desk-integration/adapter.test.mjs tests/desk-integration/scope.test.mjs
node --test tests/desk/draft.test.mjs
