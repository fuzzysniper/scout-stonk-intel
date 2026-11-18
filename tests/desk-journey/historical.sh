#!/usr/bin/env bash
# Preserve the frozen #191 scope/browser contract in its exact historical tree.
# Actual new-head A/B bytes, adapter and UX are tested separately, never substituted.
set -euo pipefail
cd "$(dirname "$0")/../.."
journey_root=$PWD
historical_tree=$(mktemp -d /tmp/unfarmd-desk191-XXXXXX)
trap 'git worktree remove --force "$historical_tree" >/dev/null 2>&1' EXIT
git worktree add --detach "$historical_tree" d838cb138f9642a2b4a4572ddf432e5f7df9614b
ln -s "$journey_root/node_modules" "$historical_tree/node_modules"
if [[ "${1:-focused}" == browser ]]; then
 ln -s "$journey_root/experiments/consumer-mvp/web/node_modules" "$historical_tree/experiments/consumer-mvp/web/node_modules"
 (cd "$historical_tree" && npm run build && node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/desk-integration/playwright.config.mjs)
else
 (cd "$historical_tree" && bash tests/desk-integration/run.sh && bash tests/desk-integration/engines.sh)
fi
