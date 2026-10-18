import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const load=async name=>import(pathToFileURL(path.join(process.env.CONSUMER_TEST_BUILD,'app/consumer',name+'.js')).href);
const {unavailableMintFacts,addressQuery,explorerAddress}=await load('onchain-model');
const {OnchainUnavailable}=await load('onchain');
const mint='So11111111111111111111111111111111111111112'; // Submitted address, not an observed fixture.
const render=props=>renderToStaticMarkup(React.createElement(OnchainUnavailable,props));

test('exact addresses remain unverified; availability never supplies a slot, clock or authority default',()=>{
 for(const address of [mint,'1'.repeat(32),'DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP']){
  const state=unavailableMintFacts(address);assert.equal(state.state,'source_unavailable');assert.equal(state.mint,address);assert.equal(state.checkedSlot,null);assert.equal(state.checkedAt,null);
  for(const key of ['supply','supplyRaw','decimals','mintAuthority','freezeAuthority','name','symbol','extensions'])assert.equal(key in state,false);
 }
});
test('aliases, whitespace, duplicate query arrays and URL/HTML injection cannot produce links',()=>{
 for(const raw of ['SI','NVDAX',' '+mint,mint+' ',[mint,mint],'<script>alert(1)</script>','https://rpc.invalid/?mint='+mint,'0'.repeat(44),'1'.repeat(31),null,undefined]){
  assert.equal(unavailableMintFacts(raw),null);assert.throws(()=>addressQuery(raw));assert.throws(()=>explorerAddress(raw));
 }
});
test('share and Explorer links retain exact submitted identity without accepting a network target',()=>{
 assert.equal(addressQuery(mint),'/?mint='+mint);
 const url=new URL(explorerAddress(mint));assert.equal(url.origin,'https://explorer.solana.com');assert.equal(url.pathname,'/address/'+mint);assert.equal(url.search,'?cluster=mainnet-beta');
 assert.equal(new URL(addressQuery(mint),'https://example.invalid').searchParams.get('mint'),mint);
});
test('unavailable SSR says neither token proof nor zero supply/absent authority; definitions explain limits',()=>{
 const html=render({mint});
 for(const text of ['Onchain source unavailable','No blockchain check was made','cannot confirm','Checked slot','no verified response','no check completed','have not been checked','What we don’t know','Token-2022','not a price','would not mean the token is safe','would not prove unrestricted transfers','identity, safety, asset backing, rewards or payments'])assert.ok(html.includes(text),text);
 assert.doesNotMatch(html,/This address is a token mint on Solana|Supply: 0|No mint authority verified|Transfers cannot be frozen|verified_onchain_mint_at_slot/);
 assert.match(html,/id="answer-title"/);assert.match(html,/rel="noopener noreferrer"/);assert.match(html,/target="_blank"/);
});
test('unknown address never acquires StonkFun names, dates, financial payload or synthetic extra-prop facts',()=>{
 const html=render({mint,slot:9999999999,supplyRaw:'18446744073709551615',mintAuthority:null,state:'verified_onchain_mint_at_slot',checkedAt:'2099-01-01T00:00:00Z'});
 assert.doesNotMatch(html,/9999999999|18446744073709551615|2099-01-01|Super Inu|NVDAX|GLDX|SPCXX|NVIDIA|SpaceX|14 Oct/);
 assert.doesNotMatch(html,/"distributedRaw"|"amountRaw"|"priceUsd"|"apy"/);
 assert.equal(render({mint:'SI'}),'');
});
test('historical mode is explicitly separate and cannot create a second result heading',()=>{
 const html=render({mint,historical:true});assert.match(html,/separate, stale 14 Oct 2026 capture/);assert.match(html,/does not verify current blockchain facts/);
 assert.doesNotMatch(html,/<h1|id="answer-title"|Not in these examples/);
});
test('inactive frontend has no transport, successful fixture or activation path',()=>{
 const files=['app/consumer/onchain.tsx','app/consumer/onchain-model.ts','app/consumer/home.tsx'].map(f=>readFileSync(f,'utf8')).join('\n');
 assert.doesNotMatch(files,/fetch\s*\(|XMLHttpRequest|NEXT_PUBLIC_|process\.env|window\.__|getAccountInfo|mockResponse|fixture\.json/);
});
