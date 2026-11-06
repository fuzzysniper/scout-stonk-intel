#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p node_modules/.cache/native-publisher-diagnostics
git cat-file blob d969ce8e33ca4ad7b043de3c9d0f17a1dc273102 > node_modules/.cache/native-publisher-diagnostics/publisher.baseline
node --check ops/native-pilot-admission/publisher.mjs
node --test --test-isolation=none --test-reporter=spec tests/native-publisher-diagnostics/*.test.mjs
