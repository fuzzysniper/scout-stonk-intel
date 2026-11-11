// Run from repository root with the existing local HTTP server on port 8141.
import {chromium} from '../../../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const directory = fileURLToPath(new URL('.', import.meta.url));
const base = 'http://127.0.0.1:8141/docs/brand/unfarmd-symbols/';
const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
const results = [];
try {
  for (const width of [320,390,1280]) {
    const page = await browser.newPage({viewport:{width,height:1000}, deviceScaleFactor:1});
    const external = [], errors = [];
    page.on('request', r => {if(!r.url().startsWith(base)) external.push(r.url());});
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base+'refinement/');
    const state = await page.evaluate(() => ({overflow:document.documentElement.scrollWidth>innerWidth,
      loaded:[...document.images].every(i=>i.complete&&i.naturalWidth===64),
      sizes:[...document.querySelectorAll('.size-row img,.direct-row img')].map(i=>[i.width,i.getBoundingClientRect().width]),
      columns:document.querySelectorAll('.before-after article').length}));
    assert.equal(state.overflow,false); assert.equal(state.loaded,true); assert.equal(state.columns,2);
    assert.equal(state.sizes.length,32); assert(state.sizes.every(([a,b])=>a===b));
    assert.deepEqual(external,[]); assert.deepEqual(errors,[]);
    await page.screenshot({path:path.join(directory,`before-after-${width}.png`),fullPage:true});
    if(width===1280) {
      await page.locator('.native-pairs').screenshot({path:path.join(directory,'native-pairs-1x.png')});
      await page.locator('.before-after').screenshot({path:path.join(directory,'masters-and-pairings-1x.png')});
    }
    results.push({width,deviceScaleFactor:1,result:'PASS',nativeSizeSamples:32,externalRequests:0,pageErrors:0,horizontalOverflow:false});
    await page.close();
  }
  // Actual browser-rasterized, transparent PNG samples. No upscaling or pixel editing.
  for (const size of [16,24,32,64]) for (const suffix of ['', '-reversed']) {
    const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});
    await page.setContent(`<body style="margin:0;background:transparent"><img alt="The Outlier refined" width="${size}" height="${size}" src="${base}final/outlier${suffix}.svg"></body>`);
    await page.locator('img').evaluate(i=>i.decode());
    await page.locator('img').screenshot({path:path.join(directory,`../final/outlier${suffix}-${size}.png`),omitBackground:true});
    await page.close();
  }
  fs.writeFileSync(path.join(directory,'browser-results.json'),JSON.stringify({browser:browser.version(),results},null,2)+'\n');
  console.log(JSON.stringify(results));
} finally {await browser.close();}
