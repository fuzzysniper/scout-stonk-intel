#!/usr/bin/env bash
# Unchanged integration/source reviewers on their exact immutable input. Never rebaseline an old guard.
set -euo pipefail
cd "$(dirname "$0")/../.."
node --test tests/oracle-ca-recovery-v2/scope.test.mjs
root_recovery=$PWD
input_recovery=$(mktemp -d /tmp/ca-recovery-parent-XXXXXX)
trap 'git -C "$root_recovery" worktree remove --force "$input_recovery" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$input_recovery" 8effe6ba0967d7a83e976840d5ed8df1d95fcbf5
ln -s "$root_recovery/node_modules" "$input_recovery/node_modules"
if [[ -d "$root_recovery/experiments/consumer-mvp/web/node_modules" ]];then ln -s "$root_recovery/experiments/consumer-mvp/web/node_modules" "$input_recovery/experiments/consumer-mvp/web/node_modules";fi
(cd "$input_recovery"
 export NODE_OPTIONS="--import=$PWD/tests/security114/local-only.mjs"
 node --test tests/oracle-integration-271/verify.test.mjs
 case "${1:-}" in
 reviews) bash tests/oracle-mount-266/inputs.sh reviews;;
 native-root) bash tests/oracle-mount-266/inputs.sh a-native-root;;
 history) bash tests/oracle-mount-266/inputs.sh a-history;;
 *) exit 2;;
 esac)
node --test tests/oracle-ca-recovery-v2/scope.test.mjs
