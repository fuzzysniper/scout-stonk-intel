#!/usr/bin/env bash
# Unmodified original reviewers on their immutable inputs. NO SQL/server/provider.
set -euo pipefail
cd "$(dirname "$0")/../.."
integration_root=$PWD
integration_input=$(mktemp -d /tmp/jupiter-integration-original-XXXXXXXX)
cleanup_integration(){ git -C "$integration_root" worktree remove --force "$integration_input" >/dev/null 2>&1 || true; }
trap cleanup_integration EXIT
git worktree add --detach "$integration_input" 0ba7b2355acb72386f0d4f810f3601290cacb0cb >/dev/null
ln -s "$integration_root/node_modules" "$integration_input/node_modules"
(
 cd "$integration_input"
 bash tests/jupiter-approval-integration/replay.sh
)
node --test tests/jupiter-stop-correction/scope.test.mjs
