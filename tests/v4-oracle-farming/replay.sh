#!/usr/bin/env bash
# Existing guards/inputs are immutable. Replay is inherited coverage, not current-tree guard success.
set -euo pipefail
cd "$(dirname "$0")/../.."
root=$PWD
node --test tests/v4-oracle-farming/scope.test.mjs
parent=$(mktemp -d /tmp/farm253-inherited-XXXXXX)
trap 'git worktree remove --force "$parent" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$parent" aa58f76bcde6fef761683a6fbcd552c00ee34312
ln -s "$root/node_modules" "$parent/node_modules"
ln -s "$root/experiments/consumer-mvp/web/node_modules" "$parent/experiments/consumer-mvp/web/node_modules"
case "${1:-}" in
 root|history|source|browser) (cd "$parent" && bash tests/v4-pg18-install/replay.sh "$1");;
 guards) (cd "$parent" && node --test tests/v4-pg18-install/scope.test.mjs);;
 *) exit 2;;
esac
node --test tests/v4-oracle-farming/scope.test.mjs
