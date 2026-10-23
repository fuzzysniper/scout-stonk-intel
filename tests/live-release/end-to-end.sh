#!/usr/bin/env bash
# One actual A -> native TLS/SQL B -> C client/decoder flow; SYNTHETIC LOCAL evidence only.
set -euo pipefail
cd "$(dirname "$0")/../.."
release_build_dir=$(mktemp -d /tmp/scout-release-code-XXXXXX)
trap 'rm -rf "$release_build_dir"' EXIT
./node_modules/.bin/tsc experiments/live-stream/worker.ts app/consumer/live-model.ts app/consumer/live-client.ts --target ES2023 --module commonjs --strict --skipLibCheck --resolveJsonModule --esModuleInterop --rootDir . --outDir "$release_build_dir"
NODE_ENV=test LIVE_STREAM_BUILD="$release_build_dir/experiments/live-stream" LIVE_FEED_TEST_BUILD="$release_build_dir" NODE_OPTIONS="--import=$PWD/tests/security114/local-only.mjs" node --test tests/live-release/end-to-end.test.mjs
