#!/usr/bin/env bash
# Existing265 diagnostics guard and original A/B/C assertions remain byte-identical on immutable inputs.
set -euo pipefail
cd "$(dirname "$0")/../.."
regression265_root=$PWD
node --test tests/oracle-regression-265/scope.test.mjs
case "${1:-}" in diagnostics) regression265_ref=9614797537a1c8bed7e3cf2d506eb38723983cc5;; *) regression265_ref=412ba2bdacb4dbcff8c11eda3a751edc1b758d32;; esac
regression265_tree=$(mktemp -d /tmp/oracle265-input-XXXXXX)
trap 'git -C "$regression265_root" worktree remove --force "$regression265_tree" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$regression265_tree" "$regression265_ref"
ln -s "$regression265_root/node_modules" "$regression265_tree/node_modules"
if [[ -d "$regression265_root/experiments/consumer-mvp/web/node_modules" ]];then ln -s "$regression265_root/experiments/consumer-mvp/web/node_modules" "$regression265_tree/experiments/consumer-mvp/web/node_modules";fi
(cd "$regression265_tree"
 case "${1:-}" in
 diagnostics) node --test tests/oracle-inspect-265/inspect.test.mjs;;
 browser-original) bash tests/oracle-v5/run.sh browser;;
 aggregate) node --test tests/oracle-v5/scope.test.mjs;bash tests/oracle-v5/run.sh;bash tests/oracle-v5/inputs.sh foundation;bash tests/oracle-v5/inputs.sh peers;;
 a-native-root|a-history) bash tests/oracle-v5/inputs.sh "$1";;
 *) exit 2;;
 esac)
node --test tests/oracle-regression-265/scope.test.mjs
