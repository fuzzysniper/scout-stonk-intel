#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
live_feed_build_dir=$(mktemp -d)
trap 'rm -rf "$live_feed_build_dir"' EXIT
./node_modules/.bin/tsc app/consumer/live-model.ts app/consumer/live-client.ts --target ES2023 --module commonjs --strict --skipLibCheck --rootDir . --outDir "$live_feed_build_dir"
LIVE_FEED_TEST_BUILD="$live_feed_build_dir" node --test tests/live-feed/model.test.mjs
