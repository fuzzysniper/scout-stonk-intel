#!/usr/bin/env bash
# Original reviewers unchanged, on exact277; NO root runner, SQL or provider access.
set -euo pipefail
cd "$(dirname "$0")/../.."
prototype_root=$PWD
prototype_input=$(mktemp -d /tmp/jupiter-prototype-original-XXXXXXXX)
cleanup_prototype(){ git -C "$prototype_root" worktree remove --force "$prototype_input" >/dev/null 2>&1 || true; }
trap cleanup_prototype EXIT
git worktree add --detach "$prototype_input" 672229542d68b81caa955a16387fd92527f1bb9d >/dev/null
ln -s "$prototype_root/node_modules" "$prototype_input/node_modules"
(
 cd "$prototype_input"
 export NODE_OPTIONS="--import=$PWD/tests/security114/local-only.mjs"
 node --test tests/jupiter-beta-276/scope.test.mjs
 bash tests/jupiter-beta-276/replay.sh
)
node --test tests/jupiter-approval-prototype/scope.test.mjs
