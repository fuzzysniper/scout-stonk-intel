#!/usr/bin/env bash
# Inherit #242's exact-input replay discipline: no modifications/waivers to ANY original reviewer or runtime.
set -euo pipefail
cd "$(dirname "$0")/../.."
root=$PWD
frozen=$(mktemp -d /tmp/ca244-parent-XXXXXX)
trap 'git worktree remove --force "$frozen" >/dev/null 2>&1 || true' EXIT
node --test tests/v4-ca-intelligence/scope.test.mjs
git worktree add --detach "$frozen" 9aff67c14d0feb5597a7bca8fd20fbb101d3640f
ln -s "$root/node_modules" "$frozen/node_modules"
case "${1:-}" in
 native) (cd "$frozen" && bash tests/v4-neon-host/affected.sh);;
 root) (cd "$frozen" && bash tests/v4-neon-host/replay.sh root);;
 history) (cd "$frozen" && bash tests/v4-neon-host/replay.sh history);;
 browser)
  ln -s "$root/experiments/consumer-mvp/web/node_modules" "$frozen/experiments/consumer-mvp/web/node_modules"
  (cd "$frozen" && bash tests/v4-neon-host/browser.sh);;
 built)
  identity=$(sha256sum .next/BUILD_ID)
  ln -s "$root/.next" "$frozen/.next"
  (cd "$frozen" && bash tests/v4-neon-host/replay.sh built)
  [[ "$(sha256sum .next/BUILD_ID)" == "$identity" ]];;
 *) exit 2;;
esac
node --test tests/v4-ca-intelligence/scope.test.mjs
