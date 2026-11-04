#!/usr/bin/env bash
# Historical incompatibility remains true on exact #284. No expectation replacement.
set -euo pipefail
cd "$(dirname "$0")/../.."
root=$PWD
frozen=$(mktemp -d /tmp/helius-original284-XXXXXX)
trap 'git -C "$root" worktree remove --force "$frozen" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$frozen" 905f5e68a2d53a3d1e54747e0b4a9632e96b0f8a >/dev/null
ln -s "$root/node_modules" "$frozen/node_modules"
(cd "$frozen"
 NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/native-lens/run.sh
 node --test tests/native-lens/scope.test.mjs)
