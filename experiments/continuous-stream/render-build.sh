#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
npm ci --ignore-scripts
npm ci --prefix experiments/live-stream --ignore-scripts
node experiments/continuous-stream/build.mjs
