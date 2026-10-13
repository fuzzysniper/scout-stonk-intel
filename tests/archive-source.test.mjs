import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const imported=async name=>import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'lib/'+name+'.js')).href);
const {createEdition,appendEdition}=await imported('archive');
const {readArchived,archiveHealth}=await imported('archive-source');
const {GET:GETbrief}=await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'app/api/brief/route.js')).href);
const {GET}=await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'app/api/archive/route.js')).href);
const tokens=fs.readFileSync(new URL('../data/tracked-mints.json',import.meta.url));
const req=q=>({nextUrl:new URL('https://scout.storkcoin.xyz/api/archive'+q)});
test('archive source outage, recovery, immutable serving, missing edition and corruption never substitute live claims',async()=>{
 const original=globalThis.fetch,originalNow=Date.now;let clock=Date.now(),fail=true,corrupt=false,calls=0;Date.now=()=>clock;
 const e=createEdition({date:'2026-10-11',snapshot:Buffer.from('{}'),allowlist:tokens,commit:'a'.repeat(40),committedAt:'2026-10-12T03:43:00Z'},new Date('2026-10-12T03:43:00Z')),initialIndex=appendEdition({schema:1,dates:{}},e).index;let index=initialIndex;
 globalThis.fetch=async url=>{calls++;if(fail)throw Error('private upstream');if(url.includes('index.json'))return new Response(JSON.stringify(index));return new Response(corrupt?'{}':JSON.stringify(e));};
 try{
  for(const q of ['?date=2026-02-30','?date=2026-10-11&id=bad','?date=2026-10-11&date=2026-10-11'])assert.equal((await GET(req(q))).status,400);assert.equal(calls,0);
  let r=await GET(req('?date=2026-10-11'));assert.equal(r.status,503);assert.ok(!JSON.stringify(await r.json()).includes('private'));const unavailable=await archiveHealth();assert.equal(unavailable.approvedDateCount,null);assert.equal(unavailable.missingEligibleDates,null);
  clock+=60001;fail=false;r=await GET(req('?date=2026-10-11&id='+e.id));assert.equal(r.status,200);const b=await r.json();assert.equal(b.report.provisional,false);assert.equal(b.report.findingCount,0);assert.equal(b.report.version,e.id);assert.equal(r.headers.get('cache-control'),'no-store');
  assert.equal((await readArchived('2026-10-11','0'.repeat(64))).state,'absent');assert.equal((await GETbrief({nextUrl:new URL('https://scout.storkcoin.xyz/api/brief?date=2026-10-11&v='+e.id)})).status,200);assert.equal((await GETbrief({nextUrl:new URL('https://scout.storkcoin.xyz/api/brief?date=2026-10-11&v='+'0'.repeat(64))})).status,409);
  const h=await archiveHealth(new Date('2026-10-13T02:59:00Z'));assert.equal(h.latestEligibleDate,'2026-10-11');assert.equal(h.latestApprovedDate,'2026-10-11');const afterGrace=await archiveHealth(new Date('2026-10-13T03:00:00Z'));assert.equal(afterGrace.latestEligibleDate,'2026-10-12');assert.equal(afterGrace.state,'awaiting_publication_or_review');
  corrupt=true;clock+=300001;r=await GET(req('?date=2026-10-11&id='+e.id));assert.equal(r.status,503);assert.ok(!('report' in await r.json()));assert.equal((await GETbrief({nextUrl:new URL('https://scout.storkcoin.xyz/api/brief?date=2026-10-11')})).status,503);
  const editions=Array.from({length:5},(_,i)=>createEdition({date:'2026-10-'+String(6+i).padStart(2,'0'),snapshot:Buffer.from('{}'),allowlist:tokens,commit:'a'.repeat(40),committedAt:'2026-10-12T03:43:00Z'},new Date('2026-10-12T03:43:00Z')));
  index={schema:1,dates:{}};for(const candidate of editions)index=appendEdition(index,candidate).index;
  const releases=[];globalThis.fetch=async url=>{if(url.includes('index.json'))return new Response(JSON.stringify(index));return new Promise(resolve=>releases.push(()=>resolve(new Response(JSON.stringify(editions.find(candidate=>url.includes(candidate.id)))))));};
  clock+=300001;const reads=editions.map(candidate=>readArchived(candidate.body.date,candidate.id));
  await new Promise(resolve=>setTimeout(resolve,30));assert.equal(releases.length,4);for(const release of releases)release();const results=await Promise.all(reads);assert.equal(results.filter(r=>r.sourceStatus==='capacity_limited').length,1);

 }finally{globalThis.fetch=original;Date.now=originalNow;}
});
