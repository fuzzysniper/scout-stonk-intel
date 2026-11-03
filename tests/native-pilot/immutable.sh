#!/usr/bin/env bash
# Run every inherited guard unchanged on its actual immutable input; NO SQL.
set -euo pipefail
cd "$(dirname "$0")/../.."
pilot_root=$PWD
pilot_original=$(mktemp -d /tmp/native-pilot-original-XXXXXXXX)
trap 'git -C "$pilot_root" worktree remove --force "$pilot_original" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$pilot_original" ca36baba5f8d8d2d2002bcdf6e3672c2c97aa7e5 >/dev/null
ln -s "$pilot_root/node_modules" "$pilot_original/node_modules"
(cd "$pilot_original"
 node --test tests/jupiter-research-v3/scope.test.mjs
 bash tests/jupiter-research-v3/replay.sh
)
