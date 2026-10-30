#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
install_build=$(mktemp -d /tmp/pg18-owner-build-XXXXXX)
trap 'rm -rf "$install_build"' EXIT
./node_modules/.bin/tsc next-env.d.ts app/lens/ca-view.tsx tests/v4-owner-preview/browser-entry.tsx --jsx react-jsx lib/v4-ca-intelligence/*.ts lib/v4-owner-preview/*.ts lib/v4-owner-ledger/*.ts lib/v4-owner-thesis/*.ts lib/v4-private-journal/*.ts lib/v4-thesis-api/*.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$install_build"
mkdir -p "$install_build/ops/v4-journal"
ln -s "$PWD/ops/v4-journal/native-tls.mjs" "$install_build/ops/v4-journal/native-tls.mjs"
ln -s "$PWD/ops/v4-journal/envelope.mjs" "$install_build/ops/v4-journal/envelope.mjs"
export JOURNAL_BUILD="$install_build" V4_OWNER_BUILD="$install_build" V4_CA_BUILD="$install_build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
if [[ "${1:-}" == browser ]];then
 node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/v4-owner-preview/playwright.config.mjs
 git restore -- docs/v4/owner-preview-243/*.png
else
 node --conditions=react-server --test --test-concurrency=1 tests/v4-pg18-install/permissions.test.mjs tests/v4-pg18-install/command.test.mjs tests/v4-owner-preview/auth.test.mjs tests/v4-owner-preview/installed.test.mjs tests/v4-owner-preview/keys.test.mjs tests/v4-owner-preview/presentation.test.mjs tests/v4-owner-preview/source.test.mjs
 bash tests/v4-neon-host/affected.sh
fi
