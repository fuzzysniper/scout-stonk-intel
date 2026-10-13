import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const imported=async name=>import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,name+'.js')).href);
const {verifyRelease,validateOptions}=await imported('scripts/verify-release');
const {archiveReport}=await imported('lib/archive');
const {archiveInventory,dryRun}=await imported('scripts/publication-dry-run');
const index=JSON.parse(fs.readFileSync(new URL('../data/brief-archive/index.json',import.meta.url),'utf8')),date='2026-10-11',id=index.dates[date].original;
const edition=JSON.parse(fs.readFileSync(new URL('../data/brief-archive/'+date+'/'+id+'.json',import.meta.url),'utf8'));
const base='https://scout.storkcoin.xyz',editionPath='/brief/'+date+'/editions/'+id,options={base,target:'production',date,expectedId:id};
const at=new Date('2026-10-13T01:00:00Z');
// Isolated HTTP fixtures only. These do not establish live/production success.
function harness(change=()=>null){
 const calls=[];const fetcher=async(url,init)=>{
  assert.equal(init.method,'GET');assert.equal(init.redirect,'manual');assert.ok(!('authorization' in init.headers));calls.push(url);
  const custom=change(url);if(custom)return custom;
  if(url===base+'/brief/'+date)return new Response('',{status:307,headers:{location:editionPath}});
  if(url===base+editionPath)return new Response(`<link rel="canonical" href="${base+editionPath}"/><meta property="og:image" content="${base+editionPath}/opengraph-image"/>`);
  if(url.endsWith('/opengraph-image'))return new Response(Buffer.from([137,80,78,71,13,10,26,10]),{headers:{'content-type':'image/png'}});
  if(url.includes('date=2026-02-30'))return new Response('{}',{status:400});
  if(url.includes('&id='+'0'.repeat(64)))return new Response('{"status":"absent"}',{status:404});
  if(url.includes('&v='+'0'.repeat(64)))return new Response('{"status":"revision_changed"}',{status:409});
  if(url.includes('/api/archive'))return new Response(JSON.stringify({edition,report:archiveReport(edition,index)}),{headers:{'cache-control':'no-store'}});
  if(url===edition.body.source)return new Response(Buffer.from(edition.body.snapshotBase64,'base64'));
  if(url.endsWith('/data/tracked-mints.json'))return new Response(Buffer.from(edition.body.allowlistBase64,'base64'));
  if(url===base+'/brief')return new Response('',{status:307,headers:{location:'/brief/2026-10-13'}});
  if(url===base+'/status')return new Response('<title>SCOUT Data Health</title>');
  if(url===base+'/api/status')return new Response(JSON.stringify({rows:[],archive:{state:'available'}}));
  throw Error('Unexpected fixture URL');
 };return {calls,fetcher};
}
test('read-only complete archive, metadata, raw provenance and guarded failure responses pass independently',async()=>{
 const h=harness(),r=await verifyRelease(options,h.fetcher,()=>at);assert.equal(r.exitCode,0);assert.equal(r.outcome,'pass');assert.ok(h.calls.length<=15);assert.ok(r.evidence.some(e=>e.code==='edition_hash_and_claims'));assert.equal(r.evidence.filter(e=>e.code==='pinned_source_hash').length,2);
});
test('unreachable host is incomplete, not an application defect or fabricated live pass',async()=>{
 let calls=0;const r=await verifyRelease(options,async()=>{calls++;throw Error('secret DNS/provider error');},()=>at);assert.equal(calls,1);assert.equal(r.exitCode,2);assert.equal(r.evidence[0].code,'host_or_network_unreachable');assert.ok(!JSON.stringify(r).includes('secret'));assert.ok(r.evidence.every(e=>e.level!=='PASS'));
});
test('valid application 404/409/503 remain different from network failure and source outages block release proof',async()=>{
 for(const [status,code,exit] of [[404,'application_not_found',1],[409,'application_revision_conflict',1],[503,'application_source_unavailable',2]]){
  const h=harness(url=>url===base+'/brief/'+date?new Response('{}',{status}):null),r=await verifyRelease(options,h.fetcher,()=>at);assert.ok(r.evidence.some(e=>e.code===code));assert.equal(r.exitCode,exit);assert.ok(!r.evidence.some(e=>e.code==='host_or_network_unreachable'));
 }
});
test('proxy denial and access restriction never masquerade as application success',async()=>{
 const r=await verifyRelease(options,async()=>new Response('private policy details',{status:403,headers:{'x-mitmproxy-blocked-reason':'DENIED'}}),()=>at);assert.equal(r.exitCode,2);assert.equal(r.evidence[0].code,'network_policy_blocked');assert.ok(!JSON.stringify(r).includes('private policy details'));
 const h=harness(url=>url===base+'/brief/'+date?new Response('',{status:403}):null),access=await verifyRelease(options,h.fetcher,()=>at);assert.equal(access.exitCode,2);assert.ok(access.evidence.some(e=>e.code==='http_access_restricted'));
});
test('known archived date cannot silently be a provisional page or cross-origin redirect',async()=>{
 for(const response of [()=>new Response('Provisional'),()=>new Response('',{status:307,headers:{location:'https://example.invalid'+editionPath}})]){
  const h=harness(url=>url===base+'/brief/'+date?response():null),r=await verifyRelease(options,h.fetcher,()=>at);assert.equal(r.exitCode,1);
 }
});
test('source-byte mismatch, edition tampering and substituted report claims fail without leaking payloads',async()=>{
 const bad=structuredClone(edition);bad.body.rows[0].distributedTokens=999;
 for(const edit of [url=>url===edition.body.source?new Response('{}'):null,url=>url.includes('/api/archive?date='+date+'&id='+id)?new Response(JSON.stringify({edition:bad,report:archiveReport(edition,index)})):null,url=>url.includes('/api/archive?date='+date+'&id='+id)?new Response(JSON.stringify({edition,report:{...archiveReport(edition,index),provisional:true}})):null]){
  const h=harness(edit),r=await verifyRelease(options,h.fetcher,()=>at);assert.equal(r.exitCode,1);assert.ok(r.evidence.some(e=>e.level==='FAIL'));
 }
});
test('pinned source unavailable is a provenance warning, not made-up source bytes',async()=>{
 const h=harness(url=>url===edition.body.source?new Response('{}',{status:503}):null),r=await verifyRelease(options,h.fetcher,()=>at);assert.equal(r.exitCode,2);assert.ok(r.evidence.some(e=>e.code==='pinned_source_unavailable'));
});
test('UTC redirect accepts the real request rollover only, never local-date or stale-day redirects',async()=>{
 let rolled=false;const h=harness(url=>{if(url===base+'/brief'){rolled=true;return new Response('',{status:307,headers:{location:'/brief/2026-10-14'}});}return null;});
 const r=await verifyRelease(options,h.fetcher,()=>new Date(rolled?'2026-10-14T00:00:00Z':'2026-10-13T23:59:59Z'));assert.equal(r.exitCode,0);
 const wrong=harness(url=>url===base+'/brief'?new Response('',{status:307,headers:{location:'/brief/2026-10-12'}}):null);assert.equal((await verifyRelease(options,wrong.fetcher,()=>at)).exitCode,1);
});
test('target validation rejects credential URLs, insecure remote targets and arbitrary paths before reads',()=>{
 for(const value of [{base:'https://user:secret@example.invalid'},{base:'http://example.invalid'},{base:base+'/admin'},{base:base+'?token=secret'},{expectedId:'bad'},{target:'unknown'}])assert.throws(()=>validateOptions({...options,...value},at));
 assert.equal(validateOptions({...options,base:'http://127.0.0.1:3123',target:'preview'},at),'http://127.0.0.1:3123');
});
test('dry-run rejects unknown reviewed days and leaves working archive byte inventory unchanged',async()=>{
 const root=path.dirname(path.dirname(new URL(import.meta.url).pathname)),before=archiveInventory(root);
 await assert.rejects(()=>dryRun(root,'2026-10-10',at),/no_reviewed_original/);assert.equal(archiveInventory(root),before);
 const script=fs.readFileSync(new URL('../scripts/publication-dry-run.ts',import.meta.url),'utf8');assert.ok(!/gh pr|git push|SCOUT_ARCHIVE_ENABLED|GITHUB_TOKEN|workflow dispatch/.test(script));assert.match(script,/remote','remove','origin'/);assert.match(script,/finally/);
});

test('server-streamed same-origin canonical redirect is recognized, not mislabeled as provisional',async()=>{
 const h=harness(url=>url===base+'/brief/'+date?new Response('<meta http-equiv="refresh" content="0;url='+editionPath+'"/>'):null),r=await verifyRelease(options,h.fetcher,()=>at);assert.equal(r.exitCode,0);assert.ok(r.evidence.some(e=>e.code==='canonical_archived_redirect'&&e.status===200));
});
