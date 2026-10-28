#!/usr/bin/env bash
# Real optimized source-OFF UI screenshots; restore original C source images only.
set -euo pipefail
cd "$(dirname "$0")/../.."
restore_source_images(){
 for size in 320 390 1280; do git show "ec527f8b4e3fb7f0c0df7b77c459ec6502267100:tests/lens/screenshots/after-$size.png" > "tests/lens/screenshots/after-$size.png"; done
}
trap restore_source_images EXIT
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/lens/playwright.config.mjs
for size in 320 390 1280; do cp "tests/lens/screenshots/after-$size.png" "tests/v4-integration/screenshots/after-$size.png"; done
restore_source_images
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/v4-integration/playwright.config.mjs
