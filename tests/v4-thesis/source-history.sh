#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
slice_root=$PWD
slice_tree=$(mktemp -d /tmp/thesis228-original-XXXXXX)
trap 'git worktree remove --force "$slice_tree" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$slice_tree" 4af9532709c3a9bca9efe71356124328955a2877
ln -s "$slice_root/node_modules" "$slice_tree/node_modules"
(cd "$slice_tree" && node --test tests/v4-private-integration/scope.test.mjs && bash tests/v4-private-integration/source-history.sh)
