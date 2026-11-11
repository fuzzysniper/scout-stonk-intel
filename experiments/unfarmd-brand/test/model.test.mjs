import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {addressState,directionFrom,studyPath}=require(path.join(process.env.UNFARMD_TEST_BUILD,'experiments/unfarmd-brand/model.js'));
const mint='So11111111111111111111111111111111111111112';
test('reuses exact Solana guard; format acceptance never establishes account type or existence',()=>{
 assert.equal(addressState(mint),'address_only');
 assert.equal(addressState('11111111111111111111111111111111'),'address_only');
 for(const value of [mint+' ', ' '+mint, '\n'+mint,'SOL','https://example.test/?mint='+mint,'00000000000000000000000000000000','1'.repeat(31),'1'.repeat(33),'<script>alert(1)</script>','word '.repeat(12)])assert.equal(addressState(value),'invalid');
 // Case changes can produce another valid address, never an alias for this one.
 assert.equal(addressState(mint.toLowerCase()),'address_only');
 assert.notEqual(studyPath('quiet',mint),studyPath('quiet',mint.toLowerCase()));
 assert.equal(addressState(null),'idle');assert.equal(addressState(''),'empty');assert.equal(addressState(mint,true),'invalid');
 const model=readFileSync(new URL('../model.ts',import.meta.url),'utf8');assert.match(model,/import \{isExactSolanaMint\} from '\.\.\/consumer-mvp\/evidence\/guards'/);
});
test('only three opt-in design directions; external input cannot become HTML or a share address',()=>{
 assert.equal(directionFrom(null),'escape');assert.equal(directionFrom('squad'),'squad');assert.equal(directionFrom('quiet'),'quiet');assert.equal(directionFrom('<svg>'),'escape');
 const url=new URL(studyPath('quiet',mint),'http://localhost');assert.equal(url.searchParams.get('mint'),mint);assert.equal(url.searchParams.get('direction'),'quiet');
 for(const value of [null,'invalid phrase','https://example.test',mint+' '])assert.equal(new URL(studyPath('escape',value),'http://localhost').searchParams.has('mint'),false);
});
test('prototype has no provider client, request API, storage, analytics, secrets or production route import',()=>{
 const source=readFileSync(new URL('../main.ts',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|process\.env|onchain-client|market-client|\/api\//);
 assert.match(source,/Token facts not checked/);assert.match(source,/Future research/);assert.match(source,/financial figures withheld/);assert.match(source,/source rights unverified/);assert.match(source,/Token-2022/);
 assert.doesNotMatch(source,/<input[^>]+(?:private|seed|wallet)/);
 const config=readFileSync(new URL('../vite.config.mjs',import.meta.url),'utf8');assert.match(config,/connect-src 'none'/);assert.match(config,/form-action 'none'/);assert.match(config,/no-referrer/);
});
test('original SVG assets are script-free, contain no embedded/remote resources or token metrics',()=>{
 const dir=new URL('../art/',import.meta.url);
 for(const name of readdirSync(dir).filter(n=>n.endsWith('.svg'))){const svg=readFileSync(new URL(name,dir),'utf8');assert.match(svg,/<title>/);assert.doesNotMatch(svg,/<script|<foreignObject|\bon\w+=|href=|url\(https?:|base64|\$\d/);}
});
