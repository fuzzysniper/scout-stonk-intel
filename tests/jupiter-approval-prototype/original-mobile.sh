#!/usr/bin/env bash
# Original277 browser guards unchanged on their immutable input; local mocks only.
set -euo pipefail
cd "$(dirname "$0")/../.."
mobile_root=$PWD
mobile_input=$(mktemp -d /tmp/jupiter-prototype-mobile-XXXXXXXX)
cleanup_mobile(){ git -C "$mobile_root" worktree remove --force "$mobile_input" >/dev/null 2>&1 || true; }
trap cleanup_mobile EXIT
git worktree add --detach "$mobile_input" 672229542d68b81caa955a16387fd92527f1bb9d >/dev/null
ln -s "$mobile_root/node_modules" "$mobile_input/node_modules"
ln -s "$mobile_root/experiments/consumer-mvp/web/node_modules" "$mobile_input/experiments/consumer-mvp/web/node_modules"
(
 cd "$mobile_input"
 export NODE_OPTIONS="--import=$PWD/tests/security114/local-only.mjs" NEXT_TELEMETRY_DISABLED=1
 bash tests/oracle-take-274/run.sh browser
 bash tests/oracle-claim-266/run.sh browser
 bash tests/oracle-mount-266/run.sh browser
 git restore -- docs/oracle-take-274/*.png docs/oracle-claim-266/*.png docs/oracle-266/screenshots/*.png
 npm run build
 git restore -- next-env.d.ts
 bash tests/oracle-integration-271/artifact.sh
 bash tests/oracle-v5/run.sh artifact
 bash tests/oracle-take-274/run.sh optimized
 node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/jupiter-beta-276/browser.config.mjs
 git restore -- docs/jupiter-beta-276/*.png
 node --test tests/jupiter-beta-276/scope.test.mjs
)
node --test tests/jupiter-approval-prototype/scope.test.mjs
