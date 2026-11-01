#!/usr/bin/env bash
# Exact immutable integration review; original scope/security tests are never edited or waived.
set -euo pipefail
cd "$(dirname "$0")/../.."
claim_root=$PWD
claim_input=$(mktemp -d /tmp/oracle-claim-input-XXXXXXXX)
trap 'git -C "$claim_root" worktree remove --force "$claim_input" >/dev/null' EXIT
git worktree add --detach "$claim_input" 8effe6ba0967d7a83e976840d5ed8df1d95fcbf5 >/dev/null
ln -s "$claim_root/node_modules" "$claim_input/node_modules"
cd "$claim_input"
node --test tests/oracle-integration-271/verify.test.mjs
NODE_OPTIONS="--import=$claim_input/tests/security114/local-only.mjs" bash tests/oracle-mount-266/inputs.sh reviews
