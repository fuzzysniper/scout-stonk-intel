import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {api,doc,context,entry} from './fixtures.mjs';
for(const [name,mutate] of [
  ['wrong version',d=>{d.version='unfarmd-evidence/2';}],
  ['duplicate entry ID',d=>{d.entries.push(entry());}],
  ['fake identity key',d=>{d.asset.asset.assetKey='listed_equity:XNAS:NVDA';}],
  ['false identity verification',d=>{d.asset.verification='verified';}],
  ['overstated scope',d=>{d.entries[0].coverage.exhaustive=true;}],
  ['unknown category',d=>{d.entries[0].category='buy';}],
  ['unsupported score',d=>{d.entries[0].safetyScore=100;}],
  ['live flag',d=>{d.entries[0].live=true;}],
  ['raw payload',d=>{d.entries[0].rawResponse={secret:'FAKE_SECRET'};}],
  ['credential URL',d=>{d.entries[0].source.url='https://provider.invalid/?api-key=FAKE_SECRET';}],
  ['reference URL',d=>{d.entries[0].reference.id='https://user:FAKE_SECRET@provider.invalid/';}],
  ['text credential URL',d=>{d.entries[0].statement='See https://provider.invalid/?api-key=FAKE_SECRET';}],
  ['text bearer',d=>{d.entries[0].statement='Authorization: Bearer FAKE_SECRET';}],
  ['text key',d=>{d.entries[0].statement='api_key=FAKE_SECRET';}],
  ['bad hash',d=>{d.entries[0].reference.sha256='not-a-hash';}],
  ['empty reference',d=>{d.entries[0].reference={id:null,sha256:null};}],
  ['impossible date',d=>{d.entries[0].clocks.observedAt='2026-02-30T12:00:00Z';}],
  ['invalid leap date',d=>{d.entries[0].clocks.observedAt='2025-02-29T12:00:00Z';}],
  ['leap second',d=>{d.entries[0].clocks.observedAt='2026-10-27T12:00:60Z';}],
  ['timezone guessing',d=>{d.entries[0].clocks.observedAt='2026-10-27T07:00:00-05:00';}],
  ['undefined clock',d=>{delete d.entries[0].clocks.reportedAt;}],
  ['negative age',d=>{d.entries[0].maxAgeSeconds=-1;}],
  ['indefinite freshness',d=>{d.entries[0].maxAgeSeconds=Infinity;}],
  ['unbounded freshness',d=>{d.entries[0].maxAgeSeconds=604801;}],
  ['float quantity',d=>{d.entries[0].quantity={raw:1.1,decimals:2,unitAssetKey:d.asset.asset.assetKey};}],
  ['scientific notation',d=>{d.entries[0].quantity={raw:'1e20',decimals:2,unitAssetKey:d.asset.asset.assetKey};}],
  ['negative zero',d=>{d.entries[0].quantity={raw:'-0',decimals:2,unitAssetKey:d.asset.asset.assetKey};}],
  ['leading zeros',d=>{d.entries[0].quantity={raw:'010',decimals:2,unitAssetKey:d.asset.asset.assetKey};}],
  ['huge precision',d=>{d.entries[0].quantity={raw:'10',decimals:31,unitAssetKey:d.asset.asset.assetKey};}],
  ['oversized statement',d=>{d.entries[0].statement='x'.repeat(281);}],
  ['oversized collection',d=>{d.entries=Array.from({length:101},(_,i)=>({...entry(),id:`e-${i}`}));}],
  ['missing rights',d=>{delete d.entries[0].source.rights;}],
  ['unrecognized rights',d=>{d.entries[0].source.rights.status='free_api';}],
  ['dangling link',d=>{d.entries[0].contradicts=['missing'];}],
  ['self link',d=>{d.entries[0].contradicts=[d.entries[0].id];}],
])test(`hard-fail and safely redact ${name}`,()=>{
  const d=doc();mutate(d);const r=api.validateEvidence(d);assert.equal(r.ok,false);
  const serialized=api.serializeRedacted(d,context());assert.deepEqual(JSON.parse(serialized),{version:'unfarmd-evidence/1',status:'invalid',sourceGo:false,code:'validation_failed'});
  assert.ok(!JSON.stringify(r).includes('FAKE_SECRET'));assert.ok(!serialized.includes('FAKE_SECRET'));
});
test('cross-asset and cross-subject contradictions cannot be fabricated by a link',()=>{const d=doc();const other={...entry(),id:'other',subject:'different-subject',contradicts:[d.entries[0].id]};d.entries.push(other);assert.equal(api.validateEvidence(d).ok,false);other.subject=d.entries[0].subject;other.assetKey=`solana:devnet:${'1'.repeat(32)}`;assert.equal(api.validateEvidence(d).ok,false);});
test('cyclic dependency graph rejected independent of entry order',()=>{const d=doc();d.entries[0].representation='derived';d.entries[0].derivedFrom=['other'];d.entries.push({...entry(),id:'other',representation:'derived',derivedFrom:[d.entries[0].id]});assert.equal(api.validateEvidence(d).ok,false);d.entries.reverse();assert.equal(api.validateEvidence(d).ok,false);});
test('caller document cannot smuggle adapter policies into its envelope',()=>{const d=doc();d.sourcePolicies=context().sourcePolicies;assert.equal(api.validateEvidence(d).ok,false);});
test('unknown identities reject malformed or noncanonical ticker echoes',()=>{const d=doc();d.asset=api.resolveAssetIdentity({kind:'unknown',ticker:'SOL'});for(const ticker of ['https://user:FAKE_SECRET@provider.invalid','sol','bad ticker']){d.asset.asset.ticker=ticker;assert.equal(api.validateEvidence(d).ok,false);}});
test('duplicate policies and malformed context fail instead of fallback',()=>{const c=context();c.sourcePolicies.push(c.sourcePolicies[0]);assert.equal(api.evaluateEvidence(doc(),c).ok,false);delete c.evaluatedAt;assert.equal(api.evaluateEvidence(doc(),c).ok,false);});
test('redacted export omits prose, user/private IDs, source IDs, arbitrary references and financial values',()=>{
  const d=doc(),c=context();d.entries[0].id='private-user-note';d.entries[0].subject='private-subject';d.entries[0].statement='PRIVATE_FREE_TEXT';d.entries[0].reference.id='private-artifact';d.entries[0].quantity={raw:'999999999999999',decimals:8,unitAssetKey:d.asset.asset.assetKey};
  const serialized=api.serializeRedacted(d,c);for(const denied of ['private-user-note','private-subject','PRIVATE_FREE_TEXT','private-artifact','invented-test-provider','invented-test-source','999999999999999'])assert.ok(!serialized.includes(denied),denied);
  assert.equal(JSON.parse(serialized).entries[0].ordinal,1);assert.equal(api.serializeRedacted(d,c),serialized);
});
test('invalid values never leak through error paths or object keys',()=>{const d=doc();d['FAKE_SECRET_KEY']=true;assert.ok(!JSON.stringify(api.validateEvidence(d)).includes('FAKE_SECRET_KEY'));});
test('temporal and malformed-value fuzz is deterministic, bounded and never authorizes a source',()=>{
  let seed=184;const next=()=>seed=(Math.imul(seed,1103515245)+12345)>>>0;
  for(let i=0;i<500;i++){
    const d=doc();d.entries[0].clocks.observedAt=String.fromCharCode(...Array.from({length:next()%60},()=>next()%128));
    const r=api.evaluateEvidence(d,context());assert.equal(r.ok,false);assert.equal(JSON.parse(api.serializeRedacted(d,context())).sourceGo,false);
  }
});
test('offline contract never attempts network, filesystem, ambient-clock or random operations',async()=>{
  const originalFetch=globalThis.fetch,originalNow=Date.now,originalRandom=Math.random;
  globalThis.fetch=()=>{throw new Error('unauthorized external request');};Date.now=()=>{throw new Error('ambient clock');};Math.random=()=>{throw new Error('randomness');};
  try{const {evaluateEvidence,serializeRedacted}=await import('./fixtures.mjs').then(m=>m.api);for(let i=0;i<10;i++){assert.equal(evaluateEvidence(doc(),context()).ok,true);assert.ok(serializeRedacted(doc(),context()));}}
  finally{globalThis.fetch=originalFetch;Date.now=originalNow;Math.random=originalRandom;}
  for(const name of readdirSync(resolve('lib/unfarmd-evidence')).filter(n=>n.endsWith('.ts'))){
    const source=readFileSync(resolve('lib/unfarmd-evidence',name),'utf8');
    assert.doesNotMatch(source,/\b(?:fetch|WebSocket|XMLHttpRequest|setInterval|setTimeout|require)\s*\(|\b(?:process\.env|Date\.now|Math\.random)\b|from\s+["'](?:node:|https?:|pg)/,name);
    for(const match of source.matchAll(/(?:from\s+|import\s*)["']([^"']+)["']/g))assert.ok(match[1].startsWith('./'),`unscoped dependency in ${name}`);
  }
});
