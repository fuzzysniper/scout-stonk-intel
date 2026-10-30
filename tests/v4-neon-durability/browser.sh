#!/usr/bin/env bash
# Actual PR app + actual modified backend, all sources/hosted storage OFF.
set -euo pipefail
cd "$(dirname "$0")/../.."
restore_qa(){
 git restore -- next-env.d.ts tests/v4-owner-thesis/screenshots/local-bridge-{320,390,1280}.png tests/v4-thesis/screenshots/local-save-history-{320,390,1280}.png tests/v4-final/screenshots/combined-{320,390,1280}.png tests/v4-integration/screenshots/after-{320,390,1280}.png docs/live-feed-167/screenshots/{locked,disabled}-{320,390,1280}.png docs/live-feed-167/disabled-{320,390,1280}.json docs/screenshots/continuous-local-qa/parent-stop-{320,390,1280}.png
}
trap restore_qa EXIT
bash tests/v4-final/run.sh browser
bash tests/v4-owner-thesis/run.sh browser
bash tests/v4-thesis/run.sh browser
restore_qa
npm run build
git restore -- next-env.d.ts
bash tests/v4-neon-durability/built-off.sh
bash tests/v4-integration/snapshots.sh
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/consumer-homepage/playwright.config.mjs
NODE_ENV=test node tests/continuous-ledger/mobile.test.mjs
restore_qa
