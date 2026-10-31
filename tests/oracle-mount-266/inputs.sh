#!/usr/bin/env bash
# Never rebase/waive an inherited whole-tree review. Its original exact input runs unchanged.
set -euo pipefail
cd "$(dirname "$0")/../.."
repo266=$PWD
input266=$(mktemp -d /tmp/oracle266-input-XXXXXX)
trap 'git -C "$repo266" worktree remove --force "$input266" >/dev/null' EXIT
git worktree add --detach "$input266" f80ecba0d39ad854d189ff5b4c699f4310a45c1d >/dev/null
ln -s "$repo266/node_modules" "$input266/node_modules"
if [[ -d "$repo266/experiments/consumer-mvp/web/node_modules" ]];then ln -s "$repo266/experiments/consumer-mvp/web/node_modules" "$input266/experiments/consumer-mvp/web/node_modules";fi
cd "$input266"
export NODE_OPTIONS="--import=$input266/tests/security114/local-only.mjs"
case "${1:-reviews}" in
 reviews) bash tests/oracle-regression-265/run.sh;bash tests/oracle-regression-265/replay.sh diagnostics;bash tests/oracle-regression-265/replay.sh aggregate;;
 browser) bash tests/oracle-regression-265/browser.sh;;
 a-native-root|a-history) bash tests/oracle-regression-265/replay.sh "$1";;
 *) exit 2;;
esac
