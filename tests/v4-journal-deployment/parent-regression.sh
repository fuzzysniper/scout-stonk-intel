#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
package_root=$PWD
parent_tree=$(mktemp -d /tmp/journal233-parent-XXXXXX)
trap 'git worktree remove --force "$parent_tree" >/dev/null 2>&1 || true' EXIT
# The current additions-only reviewer must pass BEFORE unchanged original guards.
node --test tests/v4-journal-deployment/scope.test.mjs
# Parent guards deliberately reject every later path. They run UNCHANGED here;
# the independent reviewer above freezes every parent byte in the actual PR tree.
git worktree add --detach "$parent_tree" 76dea8aab3f26eef39c2fcbc1b0b37d13180388f
ln -s "$package_root/node_modules" "$parent_tree/node_modules"
if [[ "${1:-}" == browser ]];then
 ln -s "$package_root/experiments/consumer-mvp/web/node_modules" "$parent_tree/experiments/consumer-mvp/web/node_modules"
 (cd "$parent_tree" && bash tests/v4-thesis/run.sh browser && npm run build && git restore -- next-env.d.ts && node tests/v4-thesis/built-off.mjs && bash tests/v4-integration/snapshots.sh && node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/consumer-homepage/playwright.config.mjs && NODE_ENV=test node tests/continuous-ledger/mobile.test.mjs)
else
 (cd "$parent_tree" && node --test tests/v4-thesis/scope.test.mjs && bash tests/v4-private-integration/run.sh && bash tests/v4-thesis/source-history.sh && npm test)
fi
node --test tests/v4-journal-deployment/scope.test.mjs
