#!/usr/bin/env bash
# Execute original281's optimized isolation wrapper on ORIGINAL281, NO SQL.
set -euo pipefail
cd "$(dirname "$0")/../.."
native_root=$PWD
native_input=$(mktemp -d /tmp/native-lens-old-build-XXXXXXXX)
trap 'git -C "$native_root" worktree remove --force "$native_input" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$native_input" ca36baba5f8d8d2d2002bcdf6e3672c2c97aa7e5 >/dev/null
ln -s "$native_root/node_modules" "$native_input/node_modules"
(cd "$native_input";bash tests/jupiter-research-v3/original-build.sh)
