#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
source_root=$PWD
source_tree=$(mktemp -d /tmp/neon239-original-XXXXXX)
trap 'git worktree remove --force "$source_tree" >/dev/null 2>&1 || true' EXIT
node --test tests/v4-neon-durability/scope.test.mjs
git worktree add --detach "$source_tree" 1133d6813e6913a6846cd08f11117f2a0635d6b1
ln -s "$source_root/node_modules" "$source_tree/node_modules"
if [[ "${1:-}" == root ]];then
 (cd "$source_tree" && npm test)
else
 (cd "$source_tree" && node --test tests/v4-final/scope.test.mjs tests/v4-journal-deployment/scope.test.mjs && bash tests/v4-final/source-history.sh)
fi
node --test tests/v4-neon-durability/scope.test.mjs
