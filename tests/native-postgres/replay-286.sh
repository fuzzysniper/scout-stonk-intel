#!/usr/bin/env bash
# Original review guard unchanged on its exact original input; no SQL.
set -euo pipefail
cd "$(dirname "$0")/../.."
validation_root=$PWD
validation_input=$(mktemp -d /tmp/native-286-review-XXXXXXXX)
trap 'git -C "$validation_root" worktree remove --force "$validation_input" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$validation_input" 55a15a939d31ea9f7b79a289f930d9e2d8026d30 >/dev/null
(cd "$validation_input"; node --test tests/native-postgres/scope.test.mjs)
