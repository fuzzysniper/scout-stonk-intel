#!/usr/bin/env bash
# Keep every original reviewer AND serialized-null harness unchanged at exact inputs.
set -euo pipefail
cd "$(dirname "$0")/../.."
rc_root=$PWD
rc_original=$(mktemp -d /tmp/native-rc-original-XXXXXXXX)
trap 'git -C "$rc_root" worktree remove --force "$rc_original" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$rc_original" 4c6c50b524489f5f0f98bb41e136d0a9bf7ec32e >/dev/null
ln -s "$rc_root/node_modules" "$rc_original/node_modules"
(
 cd "$rc_original"
 bash tests/native-admission/replay.sh
 node --test tests/native-admission/scope.test.mjs
 bash tests/native-admission/run.sh
)
git worktree remove --force "$rc_original" >/dev/null
git worktree add --detach "$rc_original" 370f15cc29901e3d1d267273d09993a3283d7dd4 >/dev/null
ln -s "$rc_root/node_modules" "$rc_original/node_modules"
(cd "$rc_original"; bash tests/native-publisher-diagnostics/run.sh)
