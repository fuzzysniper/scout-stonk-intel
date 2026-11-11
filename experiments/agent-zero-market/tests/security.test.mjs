import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
const require=createRequire(import.meta.url),root=join(process.env.AGENT0_MARKET_BUILD,'experiments/agent-zero-market'),api=require(join(root,'index.js')),f=require(join(root,'fixtures.js'));
const sample=()=>{const d=f.demoInput();return api.evaluateStudy(d.plan,d.captures,d.asOf);};
function existing(){const tracked=JSON.parse(fs.readFileSync(resolve('data/tracked-mints.json')));return {mode:'recorded',candidates:tracked.map(t=>({mint:t.mint,qualification:{state:'INSUFFICIENT EVIDENCE'}})),policy:{liveAllocationCents:0},performance:{eligibleCandidates:0,pricedGenuineOutcomes:0,nav:null,netReturn:null},ledger:{head:'UNMODIFIED TEST SENTINEL',entries:17},holdings:[]};}
test('normalization/evaluation/seam perform zero HTTP, socket, credential-env or filesystem calls',()=>{
 const d=f.demoInput(),real=existing(),oldFetch=globalThis.fetch,oldEnv=process.env,patches=[];
 const deny=()=>{throw Error('UNAUTHORIZED_IO');};
 try{
  globalThis.fetch=deny;process.env=new Proxy({}, {get:deny});
  for(const [obj,key] of [[http,'request'],[http,'get'],[https,'request'],[https,'get'],[net,'connect'],[net,'createConnection'],[tls,'connect'],[fs,'readFileSync'],[fs,'writeFileSync'],[fs,'appendFileSync'],[fs,'openSync']]){patches.push([obj,key,obj[key]]);obj[key]=deny;}
  const p=f.packet(f.IDENTITIES[0],29);api.normalizeSynthetic(f.encode(p),f.IDENTITIES[0]);const r=api.evaluateStudy(d.plan,d.captures,d.asOf);const attached=api.attachSyntheticResearch(real,r);assert.equal(attached.existing,real);assert.equal(r.liveAcquisition,'DISCONNECTED_NO_ADAPTER');
 }finally{globalThis.fetch=oldFetch;process.env=oldEnv;for(const [obj,key,old] of patches)obj[key]=old;}
});
test('all seven genuine tracked identities remain insufficient and the journal-derived view is unchanged',()=>{const real=existing(),before=JSON.stringify(real),r=api.attachSyntheticResearch(real,sample());assert.equal(real.candidates.length,7);assert.equal(JSON.stringify(real),before);assert.equal(r.existing,real);assert.equal(Object.isFrozen(real),false);assert(r.existing.candidates.every(c=>c.qualification.state==='INSUFFICIENT EVIDENCE'));assert.deepEqual(r.journalCommands,[]);assert.equal(r.targetMode,'synthetic');assert.equal(r.eligibleRealMoneyCandidates,0);});
test('seam refuses synthetic-as-real promotion, nonzero eligibility/NAV or writable journal commands',()=>{const r=sample();for(const patch of [{mode:'synthetic'},{policy:{liveAllocationCents:10}},{performance:{eligibleCandidates:1,pricedGenuineOutcomes:0,nav:null,netReturn:null}},{performance:{eligibleCandidates:0,pricedGenuineOutcomes:0,nav:50,netReturn:4}},{candidates:[{mint:f.IDENTITIES[0].tokenMint,qualification:{state:'ELIGIBLE FOR FOUNDER REVIEW'}}]}])assert.throws(()=>api.attachSyntheticResearch({...existing(),...patch},r));assert.throws(()=>api.attachSyntheticResearch(existing(),{...r,journalCommands:[{kind:'outcome'}]}),/engine_report/);});
test('serialized or forged reports cannot claim the engine or become #150 import commands',()=>{const r=sample();assert.throws(()=>api.attachSyntheticResearch(existing(),JSON.parse(JSON.stringify(r))),/engine_report/);assert.throws(()=>api.attachSyntheticResearch(existing(),{...r,assurance:'production_rpc'}),/engine_report/);assert.deepEqual(Object.keys(api).sort(),['LIMITS','POLICY','WSOL','attachSyntheticResearch','evaluateStudy','normalizeSynthetic'].sort());});
test('executable module import closure excludes network, database, credentials and execution facilities',()=>{
 const ts=require(resolve('node_modules/typescript/lib/typescript.js')),files=['model.ts','normalize.ts','engine.ts','seam.ts','index.ts','../consumer-mvp/evidence/guards.ts','../consumer-mvp/evidence/strict-json.ts'];
 const allowed=new Set(['node:crypto','../consumer-mvp/evidence/guards','../consumer-mvp/evidence/strict-json','./model','./normalize','./engine','./seam']);
 for(const name of files){const source=fs.readFileSync(resolve('experiments/agent-zero-market',name),'utf8'),ast=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true);const walk=node=>{if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node)&&node.moduleSpecifier)assert(allowed.has(node.moduleSpecifier.text),name+': forbidden import');if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)assert.fail('dynamic import');ts.forEachChild(node,walk);};walk(ast);assert(!/\b(fetch|XMLHttpRequest|WebSocket|eval)\s*\(|process\s*\.\s*env|child_process|node:(?:fs|http|https|net|tls)/.test(source),name);}
});
test('bounded packet/study caps reject overflow instead of silently truncating the cohort',()=>{const d=f.demoInput();assert.throws(()=>api.evaluateStudy(d.plan,Array(api.LIMITS.captures+1).fill(d.captures[0]),d.asOf),/capture_count_limit/);const p=f.packet(f.IDENTITIES[0],29);p.bars=Array(api.LIMITS.barsPerCapture+1).fill(p.bars[0]);assert.throws(()=>api.normalizeSynthetic(f.encode(p),p.identity),/bar_limit/);});
