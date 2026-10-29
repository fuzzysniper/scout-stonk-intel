#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
root=$PWD
original=$(mktemp -d /tmp/v4-owner-thesis-original-XXXXXX)
trap 'git worktree remove --force "$original" >/dev/null 2>&1 || true' EXIT
for pin in 6efb0eb66a79087b9c7a59b9a06ad584e9130ee9 76dea8aab3f26eef39c2fcbc1b0b37d13180388f; do
 git worktree add --detach "$original" "$pin"
 ln -s "$root/node_modules" "$original/node_modules"
 if [[ "$pin" == 6efb0eb* ]]; then
  (cd "$original" && bash tests/v4-owner-ledger/run.sh)
 else
  (cd "$original" && bash tests/v4-thesis/run.sh && node --test tests/v4-thesis/scope.test.mjs)
 fi
 git worktree remove --force "$original"
done
bash tests/v4-owner-ledger/source-history.sh
