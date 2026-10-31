#!/usr/bin/env bash
# Execute every existing reviewer on its immutable input; never broaden any historical guard.
set -euo pipefail
cd "$(dirname "$0")/../.."
holders260_root=$PWD
node --test tests/oracle-holders-260/scope.test.mjs
holders260_tree=$(mktemp -d /tmp/holders260-input-XXXXXX)
trap 'git worktree remove --force "$holders260_tree" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$holders260_tree" 34d6a59763d62399cdcd94f7bccb7ea89e579a18
ln -s "$holders260_root/node_modules" "$holders260_tree/node_modules"
if [[ -d "$holders260_root/experiments/consumer-mvp/web/node_modules" ]]; then ln -s "$holders260_root/experiments/consumer-mvp/web/node_modules" "$holders260_tree/experiments/consumer-mvp/web/node_modules"; fi
case "${1:-}" in
 inputs) (cd "$holders260_tree" && bash tests/oracle-preview-258/run.sh review && bash tests/oracle-preview-258/run.sh inputs);;
 a-native-root|a-history) (cd "$holders260_tree" && bash tests/oracle-preview-258/run.sh "$1");;
 *) exit 2;;
esac
node --test tests/oracle-holders-260/scope.test.mjs
