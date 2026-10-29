import {test} from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {api,BASE,MINT,OTHER,scenario,profile,result} from './fixtures.mjs';

test('public OFF and non-test injection entry are zero credential/config/identity/state/network reads',()=>{
 const script=`
 let attempts=0;const deny=()=>{attempts++;throw Error('FORBIDDEN_SOURCE_ACCESS');};
 globalThis.fetch=deny;globalThis.WebSocket=deny;globalThis.setInterval=deny;
 const env=process.env;process.env=new Proxy(env,{get(t,k){if(/HELIUS|UNFARMD_V4|SOURCE_GO/.test(String(k)))return deny();return t[k];}});
 const {createHeliusPilot}=require(${JSON.stringify(process.env.V4_PILOT_BUILD+'/lib/v4-helius-pilot/server/index.js')});
 const {createMockPilot}=require(${JSON.stringify(process.env.V4_PILOT_BUILD+'/lib/v4-helius-pilot/server/testing.js')});
 const poison=new Proxy({},{get:deny,ownKeys:deny});
 Promise.all([createHeliusPilot(poison)(poison),createMockPilot(poison,poison)(poison)]).then(async results=>{
  for(const r of results){const b=await r.json();if(b.sourceGo!==false||b.reason!=='disabled'||b.mockOnly!==false)process.exit(1);}
  if(attempts!==0)process.exit(1);
 }).catch(()=>process.exit(1));`;
 const run=spawnSync(process.execPath,['--conditions=react-server','-e',script],{encoding:'utf8',timeout:10000,env:{...process.env,NODE_ENV:'production',UNFARMD_V4_HELIUS_PILOT_ENABLED:'true'}});
 assert.equal(run.status,0,run.stderr);assert.equal(run.signal,null);
});
test('production entry has no runtime/test constructor import and no module has native fetch/client/legacy server fallback',()=>{
 const entry=readFileSync('lib/v4-helius-pilot/server/index.ts','utf8');assert.doesNotMatch(entry,/from ["']\.\/(?:testing|engine|transport)["']|process\.env|readProviderKey\s*\(/);
 for(const file of readdirSync('lib/v4-helius-pilot/server').filter(p=>p.endsWith('.ts'))){
  const s=readFileSync('lib/v4-helius-pilot/server/'+file,'utf8');
  assert.doesNotMatch(s,/\bfetch\s*\(|\bWebSocket\s*\(|node:(?:https?|net)|onchain-mint\/server|\/api\/token|\/api\/mint-facts|SCOUT_MINT_|DATABASE_URL|NEON_/);
 }
});
for(const [name,edit] of [
 ['four mints',p=>p.mints.push('11111111111111111111111111111111')],['two mints',p=>p.mints.pop()],['duplicate mints',p=>p.mints[2]=MINT],
 ['invalid mint',p=>p.mints[2]='SOL'],['too long window',p=>p.expiresAt++],['reversed clock',p=>p.expiresAt=p.startsAt],['unsafe clock',p=>p.startsAt=NaN],
 ['HTTP origin',p=>p.origin='http://owner.invalid'],['URL credentials',p=>p.origin='https://key@owner.invalid'],['origin query',p=>p.origin+='?x=1'],
 ['unknown config',p=>p.apiKey='NOT_A_REAL_KEY'],['zero cost',p=>p.creditsPerAttempt=0],['fractional cost',p=>p.creditsPerAttempt=1.1],['unbounded credit',p=>p.maxCredits=11],['no credits',p=>p.maxCredits=0],
])test('profile fail-closed: '+name,async()=>{
 const s=scenario(),p=profile();edit(p);const r=await result(await api.createMockPilot(p,s.ports)(s.request()));assert.equal(r.body.reason,'invalid_profile');assert.equal(s.calls.keys,0);assert.equal(s.calls.rpc,0);
});
test('deadline cannot exceed5s and no profile/key getters are silently accepted',async()=>{
 const s=scenario();assert.equal((await result(await api.createMockPilot(s.p,s.ports,5001)(s.request()))).body.reason,'invalid_profile');
 let getters=0;const p=profile();Object.defineProperty(p,'id',{get(){getters++;return 'SECRET';},enumerable:true});
 assert.equal((await result(await api.createMockPilot(p,s.ports)(s.request()))).body.reason,'invalid_profile');assert.equal(getters,0);
});
test('profile/allowlist primitives cannot mutate during owner-auth await',async()=>{
 const s=scenario(),expected={subject:s.p.ownerSubject,issuer:s.p.identityIssuer,audience:s.p.origin,sessionId:'SYNTHETIC_SESSION_221',pilotId:s.p.id,authenticatedAt:BASE,expiresAt:s.p.expiresAt};let release;
 const h=s.make({identity:{authenticate:()=>new Promise(resolve=>{release=resolve;})}}),pending=h(s.request());
 s.p.ownerSubject='FORGED_OWNER';s.p.id='different-pilot';s.p.mints[0]=OTHER;release(expected);
 const r=await result(await pending);assert.equal(r.status,200);assert.equal(r.body.observation.requestedMint,MINT);
});
test('auth expiry, delayed auth and denied cached finish never read key or publish after the window',async()=>{
 const s=scenario();const identity={async authenticate(req){const owner=await s.ports.identity.authenticate(req);s.advance(900000);return owner;}};
 const r=await result(await s.make({identity})(s.request()));assert.equal(r.body.reason,'timeout');assert.equal(r.body.observation,null);assert.equal(s.calls.keys,0);
});
