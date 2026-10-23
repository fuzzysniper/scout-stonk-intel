#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
NODE_ENV=test node --test tests/continuous-ledger/api.test.mjs
NODE_ENV=test node --test tests/continuous-ledger/postgres.test.mjs
