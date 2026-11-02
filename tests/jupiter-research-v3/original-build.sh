#!/usr/bin/env bash
# Exact280 ancestor optimized isolation checks remain unchanged, never waived.
set -euo pipefail
cd "$(dirname "$0")/../.."
research_root=$PWD
research_input=$(mktemp -d /tmp/research-original-build-XXXXXXXX)
trap 'git -C "$research_root" worktree remove --force "$research_input" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$research_input" e19a7ded18b0cd63b9e06c6b5efce35447719fa0 >/dev/null
mkdir "$research_input/node_modules"
cp -a "$research_root/node_modules/." "$research_input/node_modules/"
(cd "$research_input"
 npm run build
 git restore -- next-env.d.ts
 node tests/jupiter-beta-276/artifact.mjs
 node tests/jupiter-approval-prototype/artifact.mjs
 node tests/jupiter-approval-integration/artifact.mjs
 node --test tests/jupiter-stop-correction/scope.test.mjs
)
