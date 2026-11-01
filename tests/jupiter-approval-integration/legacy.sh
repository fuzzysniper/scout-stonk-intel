#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
integration_legacy=$(mktemp -d /tmp/jupiter-integration-legacy-XXXXXXXX)
trap 'rm -rf "$integration_legacy"' EXIT
./node_modules/.bin/tsc next-env.d.ts lib/v4-ca-intelligence/jupiter-beta-admission.ts app/lens/jupiter-beta-approval.ts --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$integration_legacy"
export JUPITER_BETA_BUILD="$integration_legacy" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
node --conditions=react-server --test tests/jupiter-approval-prototype/legacy-isolation.test.mjs tests/jupiter-approval-integration/legacy.test.mjs
