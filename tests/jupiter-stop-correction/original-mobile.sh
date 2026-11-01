#!/usr/bin/env bash
# Original279 mobile/reviewer wrappers, unchanged on their immutable input. NO SQL.
set -euo pipefail
cd "$(dirname "$0")/../.."
correction_root=$PWD
correction_input=$(mktemp -d /tmp/jupiter-stop-mobile-XXXXXXXX)
trap 'git -C "$correction_root" worktree remove --force "$correction_input" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$correction_input" 0ba7b2355acb72386f0d4f810f3601290cacb0cb >/dev/null
ln -s "$correction_root/node_modules" "$correction_input/node_modules"
ln -s "$correction_root/experiments/consumer-mvp/web/node_modules" "$correction_input/experiments/consumer-mvp/web/node_modules"
(
 cd "$correction_input"
 bash tests/jupiter-approval-integration/original-mobile.sh
 node --test tests/jupiter-approval-integration/scope.test.mjs
)
node --test tests/jupiter-stop-correction/scope.test.mjs
