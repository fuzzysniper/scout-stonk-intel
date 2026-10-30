#!/usr/bin/env bash
# Preserve all original guards unchanged in exact #240; current patch reviewed separately.
set -euo pipefail
cd "$(dirname "$0")/../.."
root=$PWD
frozen=$(mktemp -d /tmp/neon241-parent-XXXXXX)
trap 'git worktree remove --force "$frozen" >/dev/null 2>&1 || true' EXIT
node --test tests/v4-neon-host/scope.test.mjs
git worktree add --detach "$frozen" add2a47a3707cca0d380325b09552b0aff0613ad
ln -s "$root/node_modules" "$frozen/node_modules"
case "${1:-}" in
 root) (cd "$frozen" && bash tests/v4-neon-durability/run.sh && bash tests/v4-neon-durability/replay.sh root);;
 history) (cd "$frozen" && bash tests/v4-neon-durability/replay.sh);;
 built)
   identity=$(sha256sum .next/BUILD_ID)
   ln -s "$root/.next" "$frozen/.next"
   (cd "$frozen" && bash tests/v4-neon-durability/built-off.sh)
   [[ "$(sha256sum .next/BUILD_ID)" == "$identity" ]];;
 *) exit 2;;
esac
node --test tests/v4-neon-host/scope.test.mjs
