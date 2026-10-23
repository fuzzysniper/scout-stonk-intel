#!/usr/bin/env bash
# A/B exact committed source, copied to a temporary LOCAL test tree. No hosted credentials or requests.
set -euo pipefail
cd "$(dirname "$0")/../.."
release_root=$PWD
fixture_dir=$(mktemp -d /tmp/scout-release-pg-XXXXXX)
trap 'rm -rf "$fixture_dir"' EXIT
# A intentionally accepts its cross-tree port only under /tmp. Use actual committed B bytes,
# not a mock store, alternate URL or relaxed test guard. Installed pg is shared read-only.
git archive HEAD lib/live-ledger lib/scout-live | tar -x -C "$fixture_dir"
ln -s "$release_root/node_modules" "$fixture_dir/node_modules"
NODE_OPTIONS="--import=$release_root/tests/security114/local-only.mjs" bash experiments/live-stream/integration-test.sh "$fixture_dir"
