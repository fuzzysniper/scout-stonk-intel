#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
NODE_ENV=test node --test tests/continuous-ledger/api.test.mjs
NODE_ENV=test node --test tests/continuous-ledger/final-gates.test.mjs
NODE_ENV=test node tests/continuous-ledger/ops-acceptance.test.mjs
node tests/continuous-ledger/scope.test.mjs
NODE_ENV=test node --test tests/continuous-ledger/postgres.test.mjs
NODE_ENV=test node tests/continuous-ledger/ops-native.test.mjs
