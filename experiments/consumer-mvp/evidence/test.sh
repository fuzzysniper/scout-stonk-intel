#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
evidence_build=$(mktemp -d)
trap 'rm -rf "$evidence_build"' EXIT
./node_modules/.bin/tsc -p experiments/consumer-mvp/evidence/tsconfig.json --outDir "$evidence_build"
export EVIDENCE_TEST_BUILD="$evidence_build"
node experiments/consumer-mvp/evidence/tools/captures.mjs
node experiments/consumer-mvp/evidence/tools/preview.mjs
node experiments/consumer-mvp/evidence/tools/expansion-captures.mjs
node experiments/consumer-mvp/evidence/tests/evidence.test.mjs
node experiments/consumer-mvp/evidence/tests/expansion.test.mjs
