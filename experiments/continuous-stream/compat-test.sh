#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
export CONTINUOUS_B_TREE="${1:?pass the exact reviewed local B checkout under /tmp}"
case "$CONTINUOUS_B_TREE" in /tmp/*) ;; *) exit 2 ;; esac
node --test experiments/continuous-stream/tests/legacy.compat.mjs
