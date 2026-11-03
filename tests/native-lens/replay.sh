#!/usr/bin/env bash
# Original reviewed security/finite guards on their ORIGINAL immutable heads; NO SQL.
set -euo pipefail
cd "$(dirname "$0")/../.."
native_root=$PWD
native_input=$(mktemp -d /tmp/native-lens-review-XXXXXXXX)
trap 'git -C "$native_root" worktree remove --force "$native_input" >/dev/null 2>&1 || true' EXIT
for native_sha in ca36baba5f8d8d2d2002bcdf6e3672c2c97aa7e5 b7168f754ad83b6539b59106933b127c964515c1 255b82014544b8d7c2d7d8219b64e810e8c030fe; do
 git worktree add --detach "$native_input" "$native_sha" >/dev/null
 ln -s "$native_root/node_modules" "$native_input/node_modules"
 (
  cd "$native_input"
  if [[ "$native_sha" == ca36baba5f8d8d2d2002bcdf6e3672c2c97aa7e5 ]]; then
   bash tests/jupiter-research-v3/replay.sh
   node --test tests/jupiter-research-v3/scope.test.mjs
  elif [[ "$native_sha" == b7168f754ad83b6539b59106933b127c964515c1 ]]; then
   node --test tests/native-evidence/scope.test.mjs
  else
   node --test tests/native-pilot/scope.test.mjs
  fi
 )
 git worktree remove --force "$native_input" >/dev/null
 done
