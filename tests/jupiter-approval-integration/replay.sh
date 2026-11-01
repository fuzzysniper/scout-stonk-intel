#!/usr/bin/env bash
# Unmodified original reviewers on their immutable inputs. NO SQL/server/provider.
set -euo pipefail
cd "$(dirname "$0")/../.."
integration_root=$PWD
integration_input=$(mktemp -d /tmp/jupiter-integration-original-XXXXXXXX)
cleanup_integration(){ git -C "$integration_root" worktree remove --force "$integration_input" >/dev/null 2>&1 || true; }
trap cleanup_integration EXIT
git worktree add --detach "$integration_input" 7e13f73d8e8a5db8c274577c9d72f096b1ee50d2 >/dev/null
ln -s "$integration_root/node_modules" "$integration_input/node_modules"
(
 cd "$integration_input"
 bash tests/jupiter-approval-prototype/replay.sh
)
node --test tests/jupiter-approval-integration/scope.test.mjs
