#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
journal_build=$(mktemp -d /tmp/unfarmd-journal-build-XXXXXX)
trap 'rm -rf "$journal_build"' EXIT
./node_modules/.bin/tsc next-env.d.ts lib/v4-private-journal/*.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$journal_build"
export JOURNAL_BUILD="$journal_build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
node --conditions=react-server --test --test-concurrency=1 tests/v4-private-journal/security.test.mjs tests/v4-private-journal/postgres.test.mjs tests/v4-private-journal/scope.test.mjs
