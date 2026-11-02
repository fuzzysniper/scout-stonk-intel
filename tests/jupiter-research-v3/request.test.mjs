// LOCAL/SYNTHETIC request framing only, not an admission or provider result.
import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {fixture,request,HOST} from './fixtures.mjs';
const require=createRequire(import.meta.url),{bindResearchRequest}=require(process.env.RESEARCH_BUILD+'/lib/v4-ca-intelligence/jupiter-research-admission.js');
const origin='https://'+HOST;
test('<=64KiB public authorization strips to the EXACT original mint-only request/headers without a source call',async()=>{
 const f=fixture(),r=await bindResearchRequest(request(f),origin);assert.ok(r);assert.equal(r.envelope,f.text);assert.equal(r.mint,f.r.scope.mints[0]);assert.equal(await r.request.text(),JSON.stringify({action:'inspect',mint:r.mint}));assert.equal(r.request.headers.get('x-unfarmd-jupiter-research'),null);assert.equal(r.request.headers.get('x-unfarmd-ca-intent'),'inspect');assert.equal(r.request.headers.get('origin'),origin);
});
for(const patch of [{host:'evil.invalid'},{origin:'https://evil.invalid'},{'x-forwarded-host':'evil.invalid'},{'x-forwarded-proto':'http'},{'sec-fetch-site':'cross-site'},{'x-unfarmd-ca-intent':'stop'},{'x-unfarmd-jupiter-research':'2'},{'x-unfarmd-jupiter-research':'3, 3'},{'content-type':'text/plain'},{'content-encoding':'gzip'},{authorization:'SYNTHETIC_FORGED'},{'x-api-key':'SYNTHETIC_FORGED'},{'x-unfarmd-native-approval':'SYNTHETIC'},{'x-unfarmd-jupiter-admission':'SYNTHETIC'},{'content-length':'65793'},{'content-length':'-1'},{'content-length':'bad'}])test('original request gates and cross-protocol isolation reject '+Object.keys(patch)[0]+'='+Object.values(patch)[0],async()=>{assert.equal(await bindResearchRequest(request(fixture(),patch),origin),null);});
for(const modify of [b=>({...b,mint:'bad'}),b=>({...b,action:'reserve'}),b=>({...b,extra:true}),b=>({action:b.action,mint:b.mint}),b=>({...b,authorization:{payload:'v1',signature:'SYNTHETIC'}}),b=>({...b,authorization:{...b.authorization,version:'unfarmd-jupiter-beta-prototype-envelope/1'}})])test('wrong mint/schema/protocol denies before any remote boundary '+String(modify),async()=>{const f=fixture(),b=modify({action:'inspect',mint:f.r.scope.mints[0],authorization:f.e});assert.equal(await bindResearchRequest(request(f,{},JSON.stringify(b)),origin),null);});
test('oversized body, duplicate key, invalid UTF8, wrong URL, aborted and too many chunks fail closed',async()=>{
 const f=fixture(),req=request(f),headers=req.headers;
 const bodies=['x'.repeat(65793),'{"action":"inspect","action":"inspect","mint":"'+f.r.scope.mints[0]+'","authorization":'+f.text+'}',Uint8Array.of(255)];
 for(const body of bodies)assert.equal(await bindResearchRequest(new Request(req.url,{method:'POST',headers,body}),origin),null);
 for(const url of [req.url+'?extra=1',req.url+'#extra',req.url.replace('/api/v4/ca-intelligence','/api/v4/theses'),req.url.replace('https:','http:')])assert.equal(await bindResearchRequest(new Request(url,{method:'POST',headers,body:'{}'}),origin),null);
 const c=new AbortController();c.abort();assert.equal(await bindResearchRequest(new Request(req.url,{method:'POST',headers,body:'{}',signal:c.signal}),origin),null);
 const stream=new ReadableStream({start(controller){for(let n=0;n<257;n++)controller.enqueue(new Uint8Array([32]));controller.close();}});assert.equal(await bindResearchRequest(new Request(req.url,{method:'POST',headers,body:stream,duplex:'half'}),origin),null);
});
test('slow streamed framing is cancelled after one second, with no retry',async()=>{
 const f=fixture();let cancelled=false;const req=request(f),body=new ReadableStream({cancel(){cancelled=true;}});const keep=setTimeout(()=>{},1500);
 try{assert.equal(await bindResearchRequest(new Request(req.url,{method:'POST',headers:req.headers,body,duplex:'half'}),origin),null);assert.equal(cancelled,true);}finally{clearTimeout(keep);}
});
