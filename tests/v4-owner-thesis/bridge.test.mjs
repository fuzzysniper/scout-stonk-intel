import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,generateKeyPairSync,sign} from 'node:crypto';
import {fixture,body,MINT,OWNER,OTHER_OWNER,JOURNAL_OWNER,cookie,TOKEN} from './fixture.mjs';
let f,x,y,s,t;
before(async()=>{f=await fixture();});after(async()=>{await f?.close();});beforeEach(async()=>{await f.reset();x=f.app();y=f.app();s=await f.session();t=await f.session();});
const read=async r=>({status:r.status,body:await r.json()});
async function csrf(app=x,session=s){const c=await app.bridge.issueCsrf(f.request(session));assert.ok(c);return c.csrfToken;}
async function create(){const b=body(),r=await read(await x.handler(f.request(s,'/api/v4/theses','POST',b,{'x-csrf-token':await csrf()})));assert.equal(r.status,201);return {b,r:r.body};}
test('real A journal GET/POST/PATCH → J signature verification → encrypted PG, independent app/session load + revision',async()=>{
 const {b,r}=await create(),path='/api/v4/theses/'+b.journalId;
 const loaded=await read(await y.handler(f.request(t,path+'?mint='+MINT)));assert.equal(loaded.status,200);assert.equal(loaded.body.entries[0].thesis,b.thesis);
 const revision=await read(await y.handler(f.request(t,path,'PATCH',{mint:MINT,requestId:randomUUID(),expectedHead:r.receipt.storageHead,action:'revise',thesis:'SYNTHETIC revised idea',invalidation:null},{'x-csrf-token':await csrf(y,t)})));assert.equal(revision.status,200);
 const final=await read(await x.handler(f.request(s,path+'?mint='+MINT)));assert.equal(final.body.entries.length,2);assert.equal(final.body.entries[0].thesis,b.thesis);assert.equal(final.body.entries[1].supersedes,final.body.entries[0].hash);
 const rows=(await f.a.db.owner.query('TABLE unfarmd_journal.events')).rows;assert.doesNotMatch(JSON.stringify(rows),/original idea|revised idea/);
 const ctx=await x.bridge.owners.resolve(f.request(s));assert.equal(x.authority.ownerId(ctx.principal,Date.now()),JOURNAL_OWNER);assert.notEqual(JOURNAL_OWNER,OWNER);assert.throws(()=>y.authority.ownerId(ctx.principal,Date.now()));
});
for(const kind of ['missing','forged','nonowner','revoked','expired','owner-header','missing-intent','wrong-intent','cross-site','cross-origin'])test('A rejects '+kind+' before journal keys/rate/DB work',async()=>{
 let session=s,headers={};if(kind==='missing')session=null;if(kind==='forged')session={cookie:cookie('FORGED')};if(kind==='nonowner')session=await f.session(OTHER_OWNER);if(kind==='revoked')await f.a.db.owner.query('DELETE FROM public.v4_owner_session WHERE id=$1',[s.id]);if(kind==='expired')await f.a.db.owner.query('UPDATE public.v4_owner_session SET "createdAt"=now()-interval \'2 minutes\',"updatedAt"=now()-interval \'2 minutes\',"expiresAt"=now()-interval \'1 second\' WHERE id=$1',[s.id]);if(kind==='owner-header')headers['x-owner-id']=JOURNAL_OWNER;if(kind==='missing-intent')headers['x-unfarmd-v4-owner-intent']='';if(kind==='wrong-intent')headers['x-unfarmd-v4-owner-intent']='journal,pilot';if(kind==='cross-site')headers['sec-fetch-site']='cross-site';if(kind==='cross-origin')headers.origin='https://evil.invalid';
 const calls=f.ring.calls,r=await x.handler(f.request(session,undefined,'GET',undefined,headers));assert.ok([400,401,403].includes(r.status));assert.equal(f.ring.calls,calls);assert.equal((await f.a.db.owner.query('SELECT count(*)::int AS n FROM unfarmd_thesis_rate.usage')).rows[0].n,0);
});
for(const method of ['POST','PATCH'])for(const kind of ['missing','other-session','tampered','cross-origin'])test(method+' CSRF '+kind+' refuses before encrypted work',async()=>{
 const {b,r}=await create(),token=kind==='other-session'?await csrf(y,t):await csrf();let value=kind==='missing'?'':kind==='tampered'?token.slice(0,-2)+'xx':token;
 const data=method==='POST'?body():{mint:MINT,requestId:randomUUID(),expectedHead:r.receipt.storageHead,action:'revise',thesis:'SYNTHETIC never saved',invalidation:null};
 const response=await x.handler(f.request(s,'/api/v4/theses'+(method==='PATCH'?'/'+b.journalId:''),method,data,{'x-csrf-token':value,...(kind==='cross-origin'?{origin:'https://evil.invalid'}:{})}));assert.equal(response.status,403);assert.equal((await f.a.db.owner.query('SELECT count(*)::int AS n FROM unfarmd_journal.events')).rows[0].n,1);
});
test('CSRF GET proposal needs actual intent/cookie, charges shared SQL rate, never issues a live owner principal',async()=>{
 assert.equal(await x.bridge.issueCsrf(f.request(null)),null);assert.equal(await x.bridge.issueCsrf(f.request(s,undefined,'GET',undefined,{'x-unfarmd-v4-owner-intent':''})),null);assert.equal(await x.bridge.issueCsrf(f.request(s,'/api/v4/theses','POST',body())),null);
 for(let i=0;i<60;i++)assert.ok(await x.bridge.issueCsrf(f.request(s)));assert.equal(await y.bridge.issueCsrf(f.request(t)),null);
});
test('only J trusted signing authority can mint principal; no cloned A context/request can substitute',async()=>{
 const bad=generateKeyPairSync('ed25519');const z=f.app({bridge:{signingKey:bad.privateKey}});assert.equal(await z.bridge.owners.resolve(f.request(s)),null);
 const request=f.request(s),context=await x.bridge.owners.resolve(request);assert.ok(context);assert.equal(await x.bridge.owners.isCurrent({...context}),false);assert.equal(await x.bridge.owners.verifyCsrf(f.request(s),context),false);
});
test('stable same-session recheck rejects cookie switch and revoked session mid read; no private response',async()=>{
 const {b}=await create(),base=y.repository.read.bind(y.repository);y.repository.read=async(...args)=>{const r=await base(...args);await f.a.db.owner.query('DELETE FROM public.v4_owner_session WHERE id=$1',[t.id]);return r;};
 const r=await read(await y.handler(f.request(t,'/api/v4/theses/'+b.journalId+'?mint='+MINT)));assert.equal(r.status,401);assert.doesNotMatch(JSON.stringify(r.body),/original idea/);
 const req=f.request(s),ctx=await x.bridge.owners.resolve(req);req.headers.set('cookie',cookie(TOKEN));assert.equal(await x.bridge.owners.isCurrent(ctx),false);
});
test('revocation after commit withholds confirmation, legitimate second app can recover committed write',async()=>{
 const original=x.repository.append.bind(x.repository);x.repository.append=async(...args)=>{const r=await original(...args);await f.a.db.owner.query('DELETE FROM public.v4_owner_session WHERE id=$1',[s.id]);return r;};
 const b=body(),r=await x.handler(f.request(s,'/api/v4/theses','POST',b,{'x-csrf-token':await csrf()}));assert.equal(r.status,401);assert.equal((await y.handler(f.request(t,'/api/v4/theses/'+b.journalId+'?mint='+MINT))).status,200);
});
test('CAS across actual instances has one winner; trusted owner mapping change denies old context',async()=>{
 const {b,r}=await create(),data={mint:MINT,expectedHead:r.receipt.storageHead,action:'revise',thesis:'SYNTHETIC CAS',invalidation:null};const one=await csrf(),two=await csrf(y,t);
 const results=await Promise.all([x.handler(f.request(s,'/api/v4/theses/'+b.journalId,'PATCH',{...data,requestId:randomUUID()},{'x-csrf-token':one})),y.handler(f.request(t,'/api/v4/theses/'+b.journalId,'PATCH',{...data,requestId:randomUUID()},{'x-csrf-token':two}))]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const ctx=await x.bridge.owners.resolve(f.request(s));await f.a.db.owner.query('UPDATE unfarmd_v4_owner.policy SET journal_owner_id=$1',[OWNER]);assert.equal(await x.bridge.owners.isCurrent(ctx),false);
});
test('pilot POST policy remains exact, GET cannot be relabeled and journal requires original method/path',async()=>{
 assert.equal(await x.boundary.verify(f.request(s)),null);assert.ok(await x.boundary.journal().verify(f.request(s)));assert.equal(await x.bridge.owners.resolve(f.request(s,'/api/v4/helius-pilot','POST',{})),null);
});
test('expiry during actual encrypted read withholds plaintext response',async()=>{
 const {b}=await create(),original=y.repository.read.bind(y.repository);y.repository.read=async(...args)=>{const r=await original(...args);await f.a.db.owner.query('UPDATE public.v4_owner_session SET "createdAt"=now()-interval \'2 minutes\',"updatedAt"=now()-interval \'2 minutes\',"expiresAt"=now()-interval \'1 second\' WHERE id=$1',[t.id]);return r;};const r=await read(await y.handler(f.request(t,'/api/v4/theses/'+b.journalId+'?mint='+MINT)));assert.equal(r.status,401);assert.doesNotMatch(JSON.stringify(r.body),/original idea/);
});
test('CSRF proposal denied on missing journal binding, arbitrary context and invalid secret configuration',async()=>{
 assert.throws(()=>f.app({bridge:{csrfKey:new Uint8Array(0)}}));assert.throws(()=>f.app({bridge:{kid:'../key'}}));const ctx=await x.bridge.owners.resolve(f.request(s));assert.equal(await x.bridge.owners.isCurrent({principal:ctx.principal,sessionTag:ctx.sessionTag,expiresAtMs:ctx.expiresAtMs}),false);
});

test('authorized mapped owner cannot decrypt a different legitimate J owner journal',async()=>{
 const now=Math.floor(Date.now()/1000),h=Buffer.from(JSON.stringify({alg:'EdDSA',typ:'JWT',kid:f.kid})).toString('base64url'),p=Buffer.from(JSON.stringify({iss:f.issuer,aud:'unfarmd-private-journal',sub:OTHER_OWNER,iat:now,nbf:now,exp:now+60,jti:randomUUID()})).toString('base64url');
 const other=x.authority.verify(h+'.'+p+'.'+sign(null,Buffer.from(h+'.'+p),f.pair.privateKey).toString('base64url'),Date.now()),id=randomUUID();
 await x.repository.append(other,{journalId:id,mint:MINT,requestId:randomUUID(),expectedHead:null,change:{kind:'created',content:{thesis:'SYNTHETIC other private owner',invalidation:null,contradictions:null},fact_snapshot_refs:[]}});
 const response=await read(await x.handler(f.request(s,'/api/v4/theses/'+id+'?mint='+MINT)));assert.equal(response.status,410);assert.doesNotMatch(JSON.stringify(response.body),/other private owner/);
});
