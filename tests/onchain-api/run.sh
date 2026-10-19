#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc app/api/mint-facts/route.ts lib/onchain-mint/server/testing.ts app/consumer/onchain-model.ts --target ES2022 --module commonjs --moduleResolution node --lib ES2022,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build_dir"
export MINT_API_TEST_BUILD="$build_dir"
export NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules"
NODE_ENV=test node --conditions=react-server tests/onchain-api/api.test.mjs
NODE_ENV=test node --conditions=react-server tests/onchain-api/state.test.mjs
NODE_ENV=test node --conditions=react-server tests/onchain-api/production.test.mjs
NODE_ENV=test node --conditions=react-server tests/onchain-api/postgres-tls.test.mjs
# REVIEW-ONLY synthetic test; no Neon/Vercel network or production env required.
NODE_ENV=test node --test tests/onchain-api/scout-neon-smoke.test.mjs
NODE_ENV=test node --conditions=react-server tests/onchain-api/native-transport.test.mjs
