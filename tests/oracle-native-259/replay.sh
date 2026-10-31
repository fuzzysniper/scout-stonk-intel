#!/usr/bin/env bash
# Original258/A/B/C assertions run unchanged on immutable inputs. No old guard rebaselining.
set -euo pipefail
cd "$(dirname "$0")/../.."
root259=$PWD
node --test tests/oracle-native-259/scope.test.mjs
frozen259=$(mktemp -d /tmp/oracle259-input-XXXXXX)
trap 'git -C "$root259" worktree remove --force "$frozen259" >/dev/null' EXIT
git worktree add --detach "$frozen259" 34d6a59763d62399cdcd94f7bccb7ea89e579a18 >/dev/null
ln -s "$root259/node_modules" "$frozen259/node_modules"
if [[ -d "$root259/experiments/consumer-mvp/web/node_modules" ]];then ln -s "$root259/experiments/consumer-mvp/web/node_modules" "$frozen259/experiments/consumer-mvp/web/node_modules";fi
(cd "$frozen259" && NODE_OPTIONS="--import=$frozen259/tests/security114/local-only.mjs" bash tests/oracle-preview-258/run.sh "$1")
node --test tests/oracle-native-259/scope.test.mjs
