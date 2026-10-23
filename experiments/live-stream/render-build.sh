#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
npm ci --ignore-scripts
npm ci --prefix experiments/live-stream --ignore-scripts
npm run --prefix experiments/live-stream build
