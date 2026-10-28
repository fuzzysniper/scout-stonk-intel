#!/usr/bin/env bash
# FULL source B suite includes its original branch-wide scope assertion.
# Run it unmodified in its exact worktree AFTER aggregate byte-preservation checks.
set -euo pipefail
cd "$(dirname "$0")/../.."
node --test tests/desk-integration/scope.test.mjs
bash tests/unfarmd-evidence/run.sh
desk_root=$PWD
risk_tree=$(mktemp -d /tmp/unfarmd-reviewed-risk-XXXXXX)
trap 'git worktree remove --force "$risk_tree" >/dev/null 2>&1' EXIT
git worktree add --detach "$risk_tree" 36ede0e45046d8dba5a5163cc57ebc94434e2513
ln -s "$desk_root/node_modules" "$risk_tree/node_modules"
(cd "$risk_tree" && bash tests/unfarmd-risk/run.sh)
