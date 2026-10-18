#!/usr/bin/env bash
set -euo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
qa=$(mktemp -d /tmp/scout114-browser.XXXXXX)
images=$(mktemp -d "$root/public/__security114.XXXXXX")
cleanup() { rm -rf -- "$images"; }
trap cleanup EXIT
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--import=$root/tests/security114/local-only.mjs"
export SCOUT_SECURITY_IMAGE_PATH="/${images##*/}"
node --input-type=module - "$root" "$images" <<'JS'
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const [root,dir]=process.argv.slice(2),sharp=createRequire(root+'/package.json')('sharp');
const image=()=>sharp({create:{width:8,height:8,channels:3,background:'#346789'}});
await image().avif().toFile(dir+'/benign.avif');await image().png().toFile(dir+'/benign.png');
writeFileSync(dir+'/benign.svg','<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#346789"/></svg>');
writeFileSync(dir+'/not-an-image.png','SYNTHETIC NON-IMAGE FIXTURE');
JS
# Preserve every existing UX screenshot. Only this temporary working directory receives new proofs.
for path in tests app data experiments .next node_modules; do ln -s "$root/$path" "$qa/$path"; done
mkdir -p "$qa/docs/consumer-v15-ux/screenshots"
ln -s "$root/docs/consumer-usability" "$qa/docs/consumer-usability"
export HISTORY_TEST_BUILD="$qa/compiled"
export NODE_PATH="$root/node_modules${NODE_PATH:+:$NODE_PATH}"
cd "$root"
./node_modules/.bin/tsc lib/pairs.ts lib/pairs-source.ts --resolveJsonModule --target ES2023 --module commonjs --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$HISTORY_TEST_BUILD"
echo "Offline browser artifacts: $qa"
cd "$qa"
node "$root/experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js" test --config "$root/tests/security114/playwright.config.mjs" "$@"
