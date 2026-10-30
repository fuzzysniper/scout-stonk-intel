// Synthetic responses only, REAL password sessions, SQL atomic budget and loopback HTTPS.
import {createRequire} from 'node:module';import {readFileSync} from 'node:fs';import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {OWNER} from './fixture.mjs';
import {policy,tlsFixture,token,envelope,MINT,OTHER} from '../v4-ca-intelligence/fixtures.mjs';
const require=createRequire(import.meta.url),b=process.env.JOURNAL_BUILD;
const {SourcePolicyAuthority}=require(b+'/lib/v4-owner-preview/source-policy.js');
const {createSourceLedger}=require(b+'/lib/v4-owner-preview/source-ledger.js');
const {createSourceOwner}=require(b+'/lib/v4-owner-preview/source-owner.js');
const {createLocalCaLookup}=require(b+'/lib/v4-ca-intelligence/testing.js');
const {createOwnerPreview}=require(b+'/lib/v4-owner-preview/runtime.js');
export async function attachSource(f){
 await f.db.owner.query(readFileSync('ops/v4-owner-auth/source-admission.sql','utf8'));
 for(const role of ['ca','ca_stopper'])await f.db.owner.query("ALTER ROLE unfarmd_v4_"+role+"_login LOGIN PASSWORD '"+f.rolePassword+"'");
 const pair=generateKeyPairSync('ed25519'),sqlSha=createHash('sha256').update(readFileSync('ops/v4-owner-auth/source-admission.sql')).digest('hex'),authority=new SourcePolicyAuthority(pair.publicKey,f.trust,f.release,sqlSha);
 const p=policy({id:'SYNTHETIC_C_APPROVAL_243',ownerSubject:OWNER,origin:f.identity.origin,maxLookups:3,maxAttempts:6,maxCredits:9});
 const releaseHash=createHash('sha256').update(JSON.stringify(f.record)).digest('hex');const payload=JSON.stringify({version:'unfarmd-ca-source-grant/1',policy:p,releaseHash,sqlSha256:sqlSha});
 const approval=authority.admit({payload,signature:sign(null,Buffer.from(payload),pair.privateKey).toString('base64url')});if(!approval)throw Error('synthetic_source_admission_failed');
 const approved=authority.inspect(approval);
 await f.db.owner.query('INSERT INTO unfarmd_v4_ca_budget.policy VALUES(true,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',[approved.recordText,approved.hash,OWNER,p.origin,releaseHash,'local_fixture',p.startsAt,p.expiresAt,p.maxLookups,p.maxAttempts,p.maxCredits,p.debit.jupiter,p.debit.helius]);await f.db.owner.query('INSERT INTO unfarmd_v4_ca_budget.state(singleton) VALUES(true)');
 const pool=f.pool('ca'),ledger=createSourceLedger({authority,approval,pool,tlsHost:'localhost'}),authorization=createSourceOwner(f.issuer,authority,approval,ledger),tls=await tlsFixture();
 const state={mode:'normal'};
 tls.handler=(req,res,text)=>{if(state.mode==='outage'){res.writeHead(503);res.end('{}');return;}res.setHeader('content-type','application/json');if(req.method==='GET'){const mint=new URL(req.url,'https://localhost').searchParams.get('query');const t=token(state.mode==='stale'?'2020-01-01T00:00:00Z':new Date().toISOString(),mint);t.name=mint===OTHER?'Synthetic Second':'Synthetic First';t.usdPrice=mint===OTHER?0.000456:0.000123;res.end(JSON.stringify(['unlisted','missing','unsupported'].includes(state.mode)?[]:[t]));}else{const rpc=JSON.parse(text),e=envelope();e.id=rpc.id;if(state.mode==='missing')e.result.value=null;if(state.mode==='unsupported')e.result.value.owner='11111111111111111111111111111111';res.end(JSON.stringify(e));}};
 const source=createLocalCaLookup(p,{authorization,ledger:ledger.ledger,keys:()=> 'SYNTHETIC_LOCAL_KEY_NOT_PROVIDER_CREDENTIAL',now:Date.now,monotonic:()=>performance.now()},tls.wire);
 const runtime=(localSource=source)=>createOwnerPreview({authority:f.trust,release:f.release,issuerPool:f.pool('issuer'),readerPool:f.pool('auth'),journalPool:f.pool('journal'),ratePool:f.pool('journal'),tlsHost:'localhost',secret:f.secret,csrfKey:Buffer.from(f.secret.slice(0,64)),delegationKey:f.jPair.privateKey,keys:f.keys,...(localSource?{localSource}:{})});
 return {p,approved,authority,approval,pool,ledger,authorization,source,tls,state,runtime,async close(){await tls.close();}};
}
export {MINT,OTHER};
