#!/usr/bin/env bash
# Original exact284 incompatibility and safety guards on their ORIGINAL immutable inputs, NO SQL.
set -euo pipefail
cd "$(dirname "$0")/../.."
remote_root=$PWD
remote_original=$(mktemp -d /tmp/native-remote-original-XXXXXXXX)
trap 'git -C "$remote_root" worktree remove --force "$remote_original" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$remote_original" 905f5e68a2d53a3d1e54747e0b4a9632e96b0f8a >/dev/null
ln -s "$remote_root/node_modules" "$remote_original/node_modules"
(cd "$remote_original"
 bash tests/native-lens/replay.sh
 node --test tests/native-lens/scope.test.mjs
 bash tests/native-lens/run.sh
)
