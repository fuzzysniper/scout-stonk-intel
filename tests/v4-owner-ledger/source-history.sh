#!/usr/bin/env bash
# Preserve all original source tests/guards unchanged, never fake a passing mutated baseline.
set -euo pipefail
cd "$(dirname "$0")/../.."
source_root=$PWD
source_tree=$(mktemp -d /tmp/v4-owner-original-XXXXXX)
trap 'git worktree remove --force "$source_tree" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$source_tree" 4af9532709c3a9bca9efe71356124328955a2877
ln -s "$source_root/node_modules" "$source_tree/node_modules"
(cd "$source_tree" && bash tests/v4-private-integration/run.sh && bash tests/v4-private-journal/run.sh && bash tests/v4-helius-pilot/run.sh && bash tests/v4-private-integration/source-history.sh)
