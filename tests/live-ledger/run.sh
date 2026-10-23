#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
NODE_ENV=test node tests/live-ledger/api.test.mjs
NODE_ENV=test node tests/live-ledger/postgres.test.mjs
