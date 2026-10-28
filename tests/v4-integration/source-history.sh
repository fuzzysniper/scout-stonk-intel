#!/usr/bin/env bash
# Original guard suites in exact source trees; current combined guards run separately.
set -euo pipefail
cd "$(dirname "$0")/../.."
v4_root=$PWD
v4_original=$(mktemp -d /tmp/unfarmd-v4-original-XXXXXX)
trap 'git worktree remove --force "$v4_original" >/dev/null 2>&1 || true' EXIT
for source in C A B; do
 case "$source" in
 C) pin=ec527f8b4e3fb7f0c0df7b77c459ec6502267100; runner=tests/lens/run.sh ;;
 A) pin=d6af31935f6202a3c8ee243735fc86d13f601a58; runner=tests/v4-solana-facts/run.sh ;;
 B) pin=6ed24c97146a39599ad0855a809735f08c83f2b8; runner=tests/unfarmd-intelligence/run.sh ;;
 esac
 git worktree add --detach "$v4_original" "$pin"
 ln -s "$v4_root/node_modules" "$v4_original/node_modules"
 (cd "$v4_original" && bash "$runner")
 git worktree remove --force "$v4_original"
done
