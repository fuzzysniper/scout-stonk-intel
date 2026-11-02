#!/usr/bin/env bash
# Preserve and execute every inherited finite reviewer on its ORIGINAL input.
set -euo pipefail
cd "$(dirname "$0")/../.."
research_root=$PWD
research_input=$(mktemp -d /tmp/research-original-XXXXXXXX)
trap 'git -C "$research_root" worktree remove --force "$research_input" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$research_input" e19a7ded18b0cd63b9e06c6b5efce35447719fa0 >/dev/null
ln -s "$research_root/node_modules" "$research_input/node_modules"
(cd "$research_input"; bash tests/jupiter-stop-correction/replay.sh)
