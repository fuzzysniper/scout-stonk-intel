#!/usr/bin/env bash
# Original audits UNCHANGED, inspecting the ACTUAL current optimized build.
set -euo pipefail
cd "$(dirname "$0")/../.."
artifact_root=$PWD
artifact_tree=$(mktemp -d /tmp/neon239-build-audit-XXXXXX)
trap 'git worktree remove --force "$artifact_tree" >/dev/null 2>&1 || true' EXIT
node --test tests/v4-neon-durability/scope.test.mjs
artifact_id=$(sha256sum .next/BUILD_ID)
git worktree add --detach "$artifact_tree" 1133d6813e6913a6846cd08f11117f2a0635d6b1
ln -s "$artifact_root/node_modules" "$artifact_tree/node_modules"
ln -s "$artifact_root/.next" "$artifact_tree/.next"
(cd "$artifact_tree" && node tests/v4-final/built-off.mjs && node tests/v4-thesis/built-off.mjs && node tests/live-ledger/built-api.mjs && node tests/continuous-ledger/built-api.mjs)
[[ "$(sha256sum .next/BUILD_ID)" == "$artifact_id" ]]
node --test tests/v4-neon-durability/scope.test.mjs
