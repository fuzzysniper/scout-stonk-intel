#!/usr/bin/env bash
# Capture the CURRENT optimized /desk using C's unchanged45 browser cases.
# Keep imported source PNGs byte-identical; new captures live in the aggregate.
set -euo pipefail
cd "$(dirname "$0")/../.."
node --input-type=module -e "import {assertAggregate} from './tests/v3-release/assertions.mjs';assertAggregate();"
restore_source_images(){
 for state in incomplete plan; do
  for size in 320 390 1280; do
   path="tests/desk-journey/screenshots/feedback-$state-$size.png"
   git show "a1e461b9248d72396f038b641c7bc79d81130e7d:$path" > "$path"
  done
 done
}
trap restore_source_images EXIT
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/desk-journey/playwright.config.mjs
for state in incomplete plan; do
 for size in 320 390 1280; do
  cp "tests/desk-journey/screenshots/feedback-$state-$size.png" "tests/v3-release/screenshots/current-$state-$size.png"
 done
done
