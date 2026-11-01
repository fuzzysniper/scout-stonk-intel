#!/usr/bin/env bash
# Reuse accepted273's exact security input; do not rerun or alter its backend/source machinery.
set -euo pipefail
cd "$(dirname "$0")/../.."
take_root=$PWD
take_input=$(mktemp -d /tmp/oracle-take-review-XXXXXXXX)
trap 'git -C "$take_root" worktree remove --force "$take_input" >/dev/null' EXIT
git worktree add --detach "$take_input" 0b342b7f2447e4ab07b09d9a8a36feb66daacbc9 >/dev/null
cd "$take_input"
node --test tests/oracle-claim-266/scope.test.mjs
