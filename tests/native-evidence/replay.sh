#!/usr/bin/env bash
# Original #281 finite reviewer stays immutable; no inherited guard widening/SQL runner.
set -euo pipefail
cd "$(dirname "$0")/../.."
root=$PWD
input=$(mktemp -d /tmp/native-original-XXXXXX)
trap 'git -C "$root" worktree remove --force "$input" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$input" ca36baba5f8d8d2d2002bcdf6e3672c2c97aa7e5 >/dev/null
(cd "$input" && node --test tests/jupiter-research-v3/scope.test.mjs)
