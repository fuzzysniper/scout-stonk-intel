#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
journey_build=$(mktemp -d /tmp/unfarmd-journey-build-XXXXXX)
trap 'rm -rf "$journey_build"' EXIT
./node_modules/.bin/tsc app/desk/journey/model.ts --target ES2023 --module commonjs --strict --skipLibCheck --rootDir . --outDir "$journey_build"
DESK_INTEGRATION_BUILD="$journey_build" node --test tests/desk-journey/adapter.test.mjs tests/desk-integration/adapter.test.mjs
node --test tests/desk-journey/scope.test.mjs
