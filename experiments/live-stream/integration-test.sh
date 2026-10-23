#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# B worktree must be a local /tmp checkout. No checkout/fetch/SQL against a hosted system here.
export SCOUT_LIVE_B_TREE="${1:?pass the separately reviewed B worktree under /tmp}"
case "$SCOUT_LIVE_B_TREE" in /tmp/*) ;; *) exit 2 ;; esac
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
./node_modules/.bin/tsc experiments/live-stream/worker.ts --target ES2023 --module commonjs --strict --skipLibCheck --resolveJsonModule --esModuleInterop --rootDir . --outDir "$build_dir"
NODE_ENV=test LIVE_STREAM_BUILD="$build_dir/experiments/live-stream" node --test experiments/live-stream/tests/combined.integration.mjs
