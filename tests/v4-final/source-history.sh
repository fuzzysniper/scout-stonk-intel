#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
root=$PWD
tree=$(mktemp -d /tmp/v4-final-original-XXXXXX)
trap 'git worktree remove --force "$tree" >/dev/null 2>&1 || true' EXIT
# Each original reviewer and suite executes unchanged, with its own exact source baseline.
for pin in 696ca6c5698c75fc926bff4623a563f6994ce032 11d97aab4823bdac797019322beeefe32a578003 698021ea716c390072872e3d482aae188375b186; do
 git worktree add --detach "$tree" "$pin"
 ln -s "$root/node_modules" "$tree/node_modules"
 case "$pin" in
  696ca6c*) (cd "$tree" && bash tests/v4-helius-native/run.sh) ;;
  11d97aa*) (cd "$tree" && node --test tests/v4-owner-thesis/scope.test.mjs && bash tests/v4-owner-thesis/run.sh) ;;
  698021e*) (cd "$tree" && node --test tests/v4-journal-deployment/scope.test.mjs && bash tests/v4-journal-deployment/run.sh) ;;
 esac
 git worktree remove --force "$tree"
done
# Exact #229/#230/#226/J/P/A/B/C plus explicit #220 integration source control.
bash tests/v4-owner-thesis/source-history.sh
git worktree add --detach "$tree" b56475c681311d35f95ee9879d9969b868a1724e
ln -s "$root/node_modules" "$tree/node_modules"
(cd "$tree" && bash tests/v4-integration/run.sh)
