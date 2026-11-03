// Actual Better Auth assembly and actual pg class, but no connection/SQL is permitted.
import test,{mock} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {load,policy,request} from './fixtures.mjs';
const require=createRequire(import.meta.url),{Pool}=require('pg'),{StrictJournalClient}=require(process.env.NATIVE_BUILD+'/ops/v4-journal/native-tls.mjs'),{ownerSession}=load('auth');
const pool=()=>new Pool({Client:StrictJournalClient,database:'unfarmd_v4_pilot',max:1,connectionTimeoutMillis:1000,query_timeout:1000,statement_timeout:800});
test('owner boundary rejects ordinary pg/plain TLS preference before auth assembly',()=>{const p=pool();try{p.options.Client=undefined;assert.throws(()=>ownerSession(policy(),'SYNTHETIC_SECRET_'.repeat(5),p,'synthetic.invalid'));}finally{void p.end();}});
for(const reason of ['no-cookie','header-only','foreign-origin','GET','prefetch','wrong-route','cookie-duplicate','bearer'])test('no owner authority/SQL from '+reason,async()=>{
 const p=pool();let connections=0;mock.method(p,'connect',async()=>{connections++;throw Error('SYNTHETIC NO CONNECTION');});
 try{const base=request(),headers=new Headers(base.headers);let method='POST',url=base.url;
 if(reason==='header-only')headers.set('x-owner-id',policy().ownerSubject);
 if(reason==='foreign-origin')headers.set('origin','https://evil.invalid');if(reason==='GET')method='GET';if(reason==='prefetch')headers.set('purpose','prefetch');
 if(reason==='wrong-route')url=url.replace('/api/native-pilot','/api/v4/helius-pilot');
 if(reason==='cookie-duplicate')headers.set('cookie','__Host-unfarmd-v4-owner=a; __Host-unfarmd-v4-owner=b');if(reason==='bearer')headers.set('authorization','Bearer SYNTHETIC');
 const verify=ownerSession(policy(),'SYNTHETIC_SECRET_'.repeat(5),p,'synthetic.invalid');assert.equal(await verify(new Request(url,{method,headers})),false);assert.equal(connections,0);
 }finally{mock.restoreAll();await p.end();}
});
