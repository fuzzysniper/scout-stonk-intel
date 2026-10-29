#!/usr/bin/env bash
# Original #229 whole-tree guard/tests remain unchanged and are actually executed.
set -euo pipefail
cd "$(dirname "$0")/../.."
source_root=$PWD
source_tree=$(mktemp -d /tmp/v4-native-original-XXXXXX)
trap 'git worktree remove --force "$source_tree" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$source_tree" 6efb0eb66a79087b9c7a59b9a06ad584e9130ee9
ln -s "$source_root/node_modules" "$source_tree/node_modules"
(cd "$source_tree" && bash tests/v4-owner-ledger/run.sh && bash tests/v4-private-integration/run.sh && bash tests/v4-private-journal/run.sh && bash tests/v4-helius-pilot/run.sh && bash tests/v4-owner-ledger/source-history.sh)
