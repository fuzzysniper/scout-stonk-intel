#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
node experiments/agent-zero-onchain/test.mjs
