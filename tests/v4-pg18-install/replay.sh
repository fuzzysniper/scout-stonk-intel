#!/usr/bin/env bash
# Original #246 and ancestor guards execute byte-exact; actual current patch has its own finite review.
set -euo pipefail
cd "$(dirname "$0")/../.."
install_root=$PWD
install_input=$(mktemp -d /tmp/pg18-original-XXXXXX)
trap 'git worktree remove --force "$install_input" >/dev/null 2>&1 || true' EXIT
node --test tests/v4-pg18-install/scope.test.mjs
git worktree add --detach "$install_input" 334400a6535d198a36bc17433d7e2813d855e603
ln -s "$install_root/node_modules" "$install_input/node_modules"
ln -s "$install_root/experiments/consumer-mvp/web/node_modules" "$install_input/experiments/consumer-mvp/web/node_modules"
case "${1:-}" in
 root|history|source) (cd "$install_input" && bash tests/v4-owner-preview/replay.sh "$1");;
 browser) (cd "$install_input" && bash tests/v4-owner-preview/replay.sh browser);;
 guards) (cd "$install_input" && node --test tests/v4-owner-preview/scope.test.mjs);;
 built)
  artifact_id=$(sha256sum .next/BUILD_ID)
  ln -s "$install_root/.next" "$install_input/.next"
  (cd "$install_input" && bash tests/v4-owner-preview/built-off.sh)
  [[ "$(sha256sum .next/BUILD_ID)" == "$artifact_id" ]];;
 *) exit 2;;
esac
node --test tests/v4-pg18-install/scope.test.mjs
