#!/usr/bin/env bash
# Compatibility entry: the single current runner compiles actual A/B/C, not stubs.
set -euo pipefail
cd "$(dirname "$0")/../.."
exec bash tests/native-lens/run.sh
