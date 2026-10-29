#!/usr/bin/env bash
# Original input guards run unchanged, including native J tests, in exact trees.
set -euo pipefail
cd "$(dirname "$0")/../.."
source_root=$PWD
source_tree=$(mktemp -d /tmp/v4-private-original-XXXXXX)
trap 'git worktree remove --force "$source_tree" >/dev/null 2>&1' EXIT
for ref in d2c4a64d6b13bd9e1ffe609b50d88f6ab581d99e ffcef289ddee14b46d17cb6223eb21bcbfed42cf; do
 git worktree add --detach "$source_tree" "$ref"
 ln -s "$source_root/node_modules" "$source_tree/node_modules"
 if [[ "$ref" == d2c4a64* ]]; then
  (cd "$source_tree" && bash tests/v4-private-journal/run.sh && node --test tests/v4-integration/scope.test.mjs)
 else
  (cd "$source_tree" && bash tests/v4-helius-pilot/run.sh && node --test tests/v4-integration/scope.test.mjs)
 fi
 git worktree remove --force "$source_tree"
done
bash tests/v4-integration/source-history.sh
