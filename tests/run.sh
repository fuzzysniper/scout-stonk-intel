#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc lib/pairs-contract.ts lib/pairs-source.ts lib/pairs.ts app/api/pairs/route.ts lib/history.ts lib/solana.ts app/api/history/route.ts lib/radar.ts app/api/radar/route.ts lib/data-health.ts app/api/status/route.ts lib/brief.ts app/api/brief/route.ts app/api/archive/route.ts scripts/archive-tool.ts scripts/verify-release.ts scripts/publication-dry-run.ts app/pairs/adapter.ts app/pairs/explorer.tsx app/radar/evidence-view.tsx app/ecosystem-footer.tsx app/site-navigation.tsx app/first-steps.tsx app/research/page.tsx --jsx react-jsx --resolveJsonModule --target ES2023 --module commonjs --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build_dir"
NODE_PATH="$PWD/node_modules" HISTORY_TEST_BUILD="$build_dir" node --test tests/pairs.test.mjs tests/pairs-api.test.mjs tests/history.test.mjs tests/history-api.test.mjs tests/history-source.test.mjs tests/radar.test.mjs tests/radar-api.test.mjs tests/signals.test.mjs tests/data-health.test.mjs tests/status-api.test.mjs tests/brief.test.mjs tests/brief-api.test.mjs tests/archive.test.mjs tests/archive-source.test.mjs tests/release-verification.test.mjs tests/readiness.test.mjs tests/ecosystem.test.mjs tests/evidence-ui.test.mjs tests/pair-explorer.test.mjs tests/collection-workflow.test.mjs tests/scheduler-staging.test.mjs

PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p "*_test.py"

./node_modules/.bin/tsc scheduler/worker.ts --target ES2022 --module esnext --moduleResolution bundler --lib ES2022,DOM --strict --skipLibCheck --outDir "$build_dir/scheduler"
SCHEDULER_TEST_BUILD="$build_dir/scheduler" node --test tests/scheduler.test.mjs
