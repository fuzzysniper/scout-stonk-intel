#!/usr/bin/env bash
# Original288 reviewers on their exact original input, unchanged. No SQL.
set -euo pipefail
cd "$(dirname "$0")/../.."
admission_root=$PWD
admission_original=$(mktemp -d /tmp/native-admission-original-XXXXXXXX)
trap 'git -C "$admission_root" worktree remove --force "$admission_original" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$admission_original" 80d952c73bf4529fd04034c85985c16898ab17e8 >/dev/null
(cd "$admission_original"; node --test tests/native-union-284/scope.test.mjs)
