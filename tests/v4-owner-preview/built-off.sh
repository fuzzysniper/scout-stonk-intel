#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
node tests/v4-owner-preview/built-off.mjs
