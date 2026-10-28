#!/usr/bin/env bash
# Original source guards execute unchanged in THEIR exact trees; these do not
# substitute for current-head byte/scope/adapter/mobile assertions.
set -euo pipefail
cd "$(dirname "$0")/../.."
release_root=$PWD
source_tree=$(mktemp -d /tmp/unfarmd-source199-XXXXXX)
trap 'git worktree remove --force "$source_tree" >/dev/null 2>&1' EXIT
git worktree add --detach "$source_tree" a1e461b9248d72396f038b641c7bc79d81130e7d
ln -s "$release_root/node_modules" "$source_tree/node_modules"
(cd "$source_tree" && bash tests/desk-journey/run.sh)
git worktree remove --force "$source_tree"
git worktree add --detach "$source_tree" df36b54d09a6f5cec304a64a7d99d7a01176e872
ln -s "$release_root/node_modules" "$source_tree/node_modules"
(cd "$source_tree" && bash tests/unfarmd-journal/run.sh)
