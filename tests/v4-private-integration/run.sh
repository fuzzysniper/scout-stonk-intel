#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
node --test tests/v4-private-integration/scope.test.mjs
bash tests/v4-solana-facts/run.sh
bash tests/unfarmd-intelligence/run.sh
bash tests/v4-integration/run.sh
