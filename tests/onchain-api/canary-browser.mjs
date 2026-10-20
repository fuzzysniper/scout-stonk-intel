// Entire browser origin/response is SYNTHETIC, intercepted before network.
// Tests real Chromium Origin behavior; NEVER actual Vercel authentication or RPC.
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('../../experiments/consumer-mvp/web/node_modules/playwright');
const HOST='scout-stonk-intel-synthetic9-riskledgerapp.vercel.app',ORIGIN='https://'+HOST;
const MINT='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',SHA='c'.repeat(40),NOW=Date.parse('2026-10-20T12:00:00Z');
const source=readFileSync('scripts/ops/usdc-canary-console.js','utf8');
const browser=await chromium.launch({executablePath:process.env.CONSUMER_CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox','--disable-dev-shm-usage']});
try {
 for(const width of [320,390,1280]) {
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});let posts=0;
  const json={version:'mint-facts/1',status:'unavailable',mint:MINT,facts:null,source:null,reason:'upstream_unavailable',warnings:[]};
  await context.addInitScript(now=>{Date.now=()=>now;},NOW);
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());assert.equal(url.origin,ORIGIN,'No external network allowed');
   if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>SYNTHETIC offline canary request test</title><p>Not Vercel or live data.</p>'});
   assert.equal(url.pathname,'/api/mint-facts');assert.equal(url.search,'?mint='+MINT);assert.equal(request.method(),'POST');posts++;
   const h=await request.allHeaders();assert.equal(h.origin,ORIGIN); // Routing interception precedes wire-only Fetch Metadata headers.
   assert.equal(h['x-scout-canary-intent'],'usdc-read-once-v1');assert.equal(request.postData(),null);
   return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify(json)});
  });
  const page=await context.newPage();await page.goto(ORIGIN);await page.addScriptTag({content:source});assert.equal(posts,0);
  const result=await page.evaluate(async({host,sha})=>globalThis.scoutUsdcCanary({deploymentHost:host,commitSha:sha,go:'ONE_USDC_POST'}),{host:HOST,sha:SHA});
  assert.equal(result.ok,false);assert.equal(result.action,'STOP_NO_RETRY');assert.equal(posts,1);
  await page.reload();assert.equal(posts,1);await page.addScriptTag({content:source});
  await assert.rejects(page.evaluate(async({host,sha})=>globalThis.scoutUsdcCanary({deploymentHost:host,commitSha:sha,go:'ONE_USDC_POST'}),{host:HOST,sha:SHA}),/STOP_NO_RETRY/);
  assert.equal(posts,1);await context.close();console.log(`PASS ${width}px synthetic browser: correct native Origin, one empty POST, reload/duplicate guard, no live network`);
 }
}finally{await browser.close();}
