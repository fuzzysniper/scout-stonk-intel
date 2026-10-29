import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,sign} from 'node:crypto';
import {auth,keyring,crypto,command,privateJournalStorage,PRIVATE_JOURNAL_APPROVAL,PostgresJournalRepository} from './fixtures.mjs';
test('installed entry is immutable OFF/null, ignores hostile JS activation objects without reading them',()=>{
 let calls=0;const hostile=new Proxy({},{get(){calls++;throw Error('DO_NOT_READ');}});
 assert.deepEqual(privateJournalStorage(hostile),{status:'disabled',saved:false});assert.equal(calls,0);
 assert.deepEqual(PRIVATE_JOURNAL_APPROVAL,{enabled:false,notBeforeMs:null,expiresAtMs:null});assert.equal(Object.isFrozen(PRIVATE_JOURNAL_APPROVAL),true);
});
for(const [name,patch,header] of [
 ['wrong issuer',{iss:'https://attacker.invalid'},{}],['wrong audience',{aud:'other'},{}],['email subject',{sub:'owner@example.invalid'},{}],
 ['wallet subject',{sub:'So11111111111111111111111111111111111111112'},{}],['expired',{exp:1},{}],['future',{nbf:9999999999,exp:9999999999},{}],
 ['long expiry',{exp:9999999999},{}],['extra owner claim',{ownerScope:randomUUID()},{}],['alg none',{}, {alg:'none'}],['unknown kid',{}, {kid:'other'}],
])test('cryptographic owner assertion rejects '+name,()=>{const a=auth();assert.throws(()=>a.authority.verify(a.token(randomUUID(),patch,header),Date.now()),/private_journal_unauthenticated/);});
test('signature tampering, malformed JWT, duplicate keys and raw object are never identity',()=>{
 const a=auth(),token=a.token(randomUUID()),p=token.split('.');p[1]=Buffer.from('{"sub":"fake"}').toString('base64url');
 for(const v of [p.join('.'),{},'x'.repeat(4097),'a.b.c',token+'=',{ownerId:randomUUID()}])assert.throws(()=>a.authority.verify(v,Date.now()),/unauthenticated/);
});
test('even correctly signed duplicate/escaped JWT claims are rejected before becoming a principal',()=>{
 const a=auth(),owner=randomUUID(),p=a.token(owner).split('.');
 const body=Buffer.from(p[1],'base64url').toString();
 for(const duplicate of ['"sub":'+JSON.stringify(owner),'"s\\u0075b":'+JSON.stringify(owner)]){
  const wire=p[0]+'.'+Buffer.from(body.slice(0,-1)+','+duplicate+'}').toString('base64url');
  assert.throws(()=>a.authority.verify(wire+'.'+sign(null,Buffer.from(wire),a.pair.privateKey).toString('base64url'),Date.now()),/unauthenticated/);
 }
});
test('mutating original key map cannot add an unrelated signer; clock rollback cannot extend principal',()=>{
 const a=auth(),b=auth(),owner=randomUUID();a.trust.keys.set('other',b.pair.publicKey);
 assert.throws(()=>a.authority.verify(b.token(owner,{}, {kid:'other'}),Date.now()),/unauthenticated/);
 const now=Date.now(),p=a.authority.verify(a.token(owner),now);assert.throws(()=>a.authority.ownerId(p,now-1),/unauthenticated/);
});
test('capability cloning or unrelated signing authority cannot reach a database or key resolver',async()=>{
 const a=auth(),b=auth(),owner=randomUUID(),ring=keyring();let connections=0;
 const repo=new PostgresJournalRepository({async connect(){connections++;throw Error('NO_IO');}},ring.keys,a.authority);
 for(const cap of [{ownerId:owner},{...a.principal(owner)},b.principal(owner)])await assert.rejects(repo.append(cap,command()),/unauthenticated/);
 assert.equal(connections,0);assert.equal(ring.calls,0);
});
test('verified principal expiry is rechecked at every method, not only token parsing',async()=>{
 const a=auth(),owner=randomUUID();let now=Date.now(),io=0;const cap=a.principal(owner);
 const repo=new PostgresJournalRepository({async connect(){io++;throw Error('NO_IO');}},keyring().keys,a.authority,()=>now);now+=300001;
 await assert.rejects(repo.list(cap),/unauthenticated/);assert.equal(io,0);
});
test('request headers, owner override, getters, cycles, Unicode/whitespace mint fail before DB',async()=>{
 const a=auth(),owner=randomUUID(),cap=a.principal(owner);let io=0,getters=0;
 const repo=new PostgresJournalRepository({async connect(){io++;throw Error('NO_IO');}},keyring().keys,a.authority);
 const getter=command();Object.defineProperty(getter,'change',{get(){getters++;throw Error('BAD');},enumerable:true});
 const cycle=command();cycle.change=cycle;
 for(const c of [command({ownerId:owner}),getter,cycle,command({mint:' '+command().mint}),command({mint:'ⓢolana'}),command({expectedHead:'x'})])await assert.rejects(repo.append(cap,c),/invalid_request/);
 assert.equal(io,0);assert.equal(getters,0);
});
test('AES256-GCM uses random nonces, ciphertext heads and owner/journal/revision-bound AAD',async()=>{
 const ring=keyring(),ctx={ownerId:randomUUID(),journalId:randomUUID(),mint:command().mint,sequence:1,previousHead:null,requestId:randomUUID()},value={note:'SYNTHETIC ONLY never log plaintext'};
 const x=await crypto.seal(value,ctx,ring.keys),y=await crypto.seal(value,ctx,ring.keys);assert.notEqual(x,y);assert.doesNotMatch(x,/never log plaintext/);
 assert.notEqual(crypto.storageHash(x),crypto.storageHash(y));assert.deepEqual(await crypto.open(x,ctx,ring.keys),value);
 for(const change of [{ownerId:randomUUID()},{journalId:randomUUID()},{mint:'11111111111111111111111111111111'},{sequence:2},{previousHead:'a'.repeat(64)},{requestId:randomUUID()}])await assert.rejects(crypto.open(x,{...ctx,...change},ring.keys),/integrity/);
 const tampered=JSON.parse(x);tampered.tag=randomBytes(16).toString('base64url');await assert.rejects(crypto.open(JSON.stringify(tampered),ctx,ring.keys),/integrity/);
});
test('missing/wrong key errors are categorical, and resolver-owned key material is not wiped',async()=>{
 const key=randomBytes(32),original=Buffer.from(key),keys=async()=>({id:'test',key}),ctx={ownerId:randomUUID(),journalId:randomUUID(),mint:command().mint,sequence:1,previousHead:null,requestId:randomUUID()};
 const sealed=await crypto.seal({note:'SYNTHETIC'},ctx,keys);assert.deepEqual(key,original);
 await assert.rejects(crypto.open(sealed,ctx,async()=>{throw Error('SYNTHETIC_PRIVATE_KEY_MARKER');}),e=>e.message==='private_journal_integrity');
});
