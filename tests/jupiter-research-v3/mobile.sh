#!/usr/bin/env bash
# All tests here use the NEW combined code. Only the original comparison baseline
# built by take274 is old. Fixtures and network traps are LOCAL/SYNTHETIC only.
set -euo pipefail
cd "$(dirname "$0")/../.."
research_mobile_cleanup(){ git restore -- next-env.d.ts docs/oracle-take-274 docs/oracle-claim-266 docs/oracle-266/screenshots docs/jupiter-beta-276; }
trap research_mobile_cleanup EXIT
bash tests/oracle-take-274/run.sh browser
bash tests/oracle-claim-266/run.sh browser
bash tests/oracle-mount-266/run.sh browser
npm run build
git restore -- next-env.d.ts
bash tests/oracle-integration-271/artifact.sh
bash tests/oracle-v5/run.sh artifact
bash tests/oracle-take-274/run.sh optimized
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/jupiter-beta-276/browser.config.mjs
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/jupiter-research-v3/browser.config.mjs
