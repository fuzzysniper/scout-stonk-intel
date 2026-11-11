/* Reproduce from repository root after: python -m http.server 8141 --bind 127.0.0.1 */
import {chromium} from '../../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const directory = fileURLToPath(new URL('.', import.meta.url));
(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  const results = [];
  try {
    for (const width of [320, 390, 1280]) {
      const page = await browser.newPage({viewport: {width, height: 1000}, deviceScaleFactor: 1});
      const external = [], errors = [];
      page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:8141/')) external.push(request.url()); });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:8141/docs/brand/unfarmd-symbols/');
      const state = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        images: [...document.images].every(image => image.complete && image.naturalWidth === 64),
        candidates: document.querySelectorAll('article').length,
        sizes: [...document.querySelectorAll('.size-row img')].map(image => [image.width, image.getBoundingClientRect().width]),
      }));
      assert.equal(state.overflow, false);
      assert.equal(state.images, true);
      assert.equal(state.candidates, 3);
      assert.equal(state.sizes.length, 24);
      assert(state.sizes.every(([attribute, rendered]) => attribute === rendered));
      assert.deepEqual(external, []);
      assert.deepEqual(errors, []);
      await page.screenshot({path: path.join(directory, `screenshots/comparison-${width}.png`), fullPage: true});
      results.push({width, deviceScaleFactor: 1, result: 'PASS', externalRequests: 0, pageErrors: 0, nativeSizeSamples: 24, horizontalOverflow: false});
      await page.close();
    }
    const page = await browser.newPage({viewport: {width: 1200, height: 920}, deviceScaleFactor: 1});
    await page.goto('http://127.0.0.1:8141/docs/brand/unfarmd-symbols/comparison.svg');
    await page.screenshot({path: path.join(directory, 'screenshots/vector-sheet-1200.png')});
    await page.close();
    fs.writeFileSync(path.join(directory, 'browser-results.json'), JSON.stringify({browser: browser.version(), results}, null, 2) + '\n');
    console.log(JSON.stringify(results));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
