// No live source/network credentials; all requests and PG clients are synthetic.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHandler,validateWindow} from '../../scripts/ops/neon-smoke-handler.mjs';
import {prepareArtifact,validateApproval,REPOSITORY_ROOT} from '../../scripts/ops/build-neon-smoke-artifact.mjs';
import {createRequire} from 'node:module';

const SHA='c'.repeat(40), NOW=1792419900000, OP='scout-neon-reviewed-987654321';
const approved={enabled:true,operationId:OP,reviewedCommitSha:SHA,startMs:NOW-1000,endMs:NOW+20000};
const env={VERCEL:'1',VERCEL_ENV:'production',VERCEL_PROJECT_ID:'prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q'};

function response() {
  const headers={},res={statusCode:0,setHeader(k,v){headers[k]=v;},end(content){res.body=content;}};
  return {res,headers};
}
test('handler import is inert; disabled manifest denies POST before pg/secret use',async()=>{
  let loaded=0,called=0;
  const handler=createHandler({env,clientFactory:async()=>{loaded++;throw Error('UNEXPECTED_IMPORT');},probe:async()=>{called++;}});
  const {res,headers}=response();
  await handler({method:'POST',url:'/_ops/neon-smoke',headers:{'content-length':'0'}},res);
  assert.equal(res.statusCode,404);assert.equal(headers['Cache-Control'],'no-store, max-age=0');
  assert.equal(loaded,0);assert.equal(called,0);
});
test('only exact empty POST in five-minute approval window is eligible',async()=>{
  const invalid=[
    [{method:'GET',url:'/_ops/neon-smoke',headers:{}},approved,env,NOW],
    [{method:'POST',url:'/_ops/neon-smoke?x=1',headers:{}},approved,env,NOW],
    [{method:'POST',url:'/_ops/neon-smoke',headers:{'content-length':'10'}},approved,env,NOW],
    [{method:'POST',url:'/_ops/neon-smoke',headers:{'transfer-encoding':'chunked'}},approved,env,NOW],
    [{method:'POST',url:'/_ops/neon-smoke',headers:{}},{enabled:false},env,NOW],
    [{method:'POST',url:'/_ops/neon-smoke',headers:{}},approved,{...env,VERCEL_ENV:'preview'},NOW],
    [{method:'POST',url:'/_ops/neon-smoke',headers:{}},approved,env,NOW+21000],
  ];
  for(const [req,approval,context,now]of invalid){
    let imports=0;
    const h=createHandler({approval,env:context,clock:()=>now,clientFactory:async()=>{imports++;throw Error('UNEXPECTED')}});
    const {res}=response();await h(req,res);
    assert.equal(res.statusCode,404);assert.equal(imports,0);
  }
  assert.equal(validateWindow({...approved,endMs:approved.startMs+300001},NOW),false);
});
test('synthetic authorized POST returns strictly allowlisted report',async()=>{
  let calls=0,clients=0;
  const handler=createHandler({approval:approved,clock:()=>NOW,env,
    clientFactory:async()=>{clients++;return class FakeClient{};},
    probe:async({argv})=>{calls++;assert.deepEqual(argv,['--execute','--approve-production-read-only']);
      return {ok:true,checks:19,tls:'TLSv1.3',rollback:'acknowledged',authenticationMechanism:'not_observed',
        requestStartedAt:'2026-10-19T14:00:00.000Z',metadataReceivedAt:'2026-10-19T14:00:00.005Z',
        serverObservedAt:'2026-10-19T14:00:00.003Z',password:'MUST_NOT_LEAK'};
    },
  });
  const {res}=response();
  await handler({method:'POST',url:'/_ops/neon-smoke',headers:{}},res);
  assert.equal(res.statusCode,200);assert.equal(calls,1);assert.equal(clients,1);
  assert.equal(JSON.parse(res.body).password,undefined);assert.match(res.body,/"checks":19/);
});
test('query errors are always generic and not echoed',async()=>{
  const h=createHandler({approval:approved,clock:()=>NOW,env,
    clientFactory:async()=>class Fake{},probe:async()=>{throw Error('DANGEROUS_PASSWORD_AND_SQL')}});
  const {res}=response();await h({method:'POST',url:'/_ops/neon-smoke',headers:{}},res);
  assert.equal(res.statusCode,503);assert.doesNotMatch(res.body,/PASSWORD|SQL/);
});
test('artifact builder defaults to OFF and stages only locked pg closure',()=>{
  const root=mkdtempSync(join(tmpdir(),'scout-offline-pack-'));
  try{
    const mkdir=p=>mkdirSync(join(root,p),{recursive:true});
    mkdir('scripts/ops');mkdir('node_modules/pg');mkdir('node_modules/pg-protocol');
    const file=(p,data)=>writeFileSync(join(root,p),data);
    file('scripts/ops/neon-smoke-handler.mjs','export default function(){}');
    file('scripts/ops/scout-neon-smoke.mjs','export const CHECKS=[];');
    file('node_modules/pg/index.js','module.exports = {}');
    file('node_modules/pg-protocol/index.js','module.exports = {}');
    file('package-lock.json',JSON.stringify({packages:{
      'node_modules/pg':{version:'8.23.1',dependencies:{'pg-protocol':'1.0.0'}},
      'node_modules/pg-protocol':{version:'1.0.0'},
    }}));
    const result=prepareArtifact({root});assert.equal(result.manifestEnabled,false);
    assert.deepEqual(result.pgClosure,['pg','pg-protocol']);
    const out=join(root,'.vercel','output');
    assert.equal(JSON.parse(readFileSync(join(out,'functions/_ops/neon-smoke.func/approval.json'),'utf8')).enabled,false);
    const config=JSON.parse(readFileSync(join(out,'config.json'),'utf8'));
    assert.equal(config.version,3);
    assert.equal(config.routes.filter(x=>x.dest==='/_ops/neon-smoke').length,1);
    assert.equal(JSON.parse(readFileSync(join(out,'functions/_ops/neon-smoke.func/.vc-config.json'),'utf8')).runtime,'nodejs24.x');
    assert.ok(result.files>=6);
    assert.throws(()=>prepareArtifact({root}),/unsafe_or_existing_output/);
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('approvals cannot be armed without reviewed commit and bounded operation',()=>{
 assert.deepEqual(validateApproval(undefined,false),{enabled:false});
 assert.throws(()=>validateApproval(approved,false,SHA));
 assert.throws(()=>validateApproval({...approved,endMs:approved.startMs+300001},true,SHA));
 assert.throws(()=>validateApproval({...approved,reviewedCommitSha:'f'.repeat(40)},true,SHA));
 assert.deepEqual(validateApproval(approved,true,SHA),approved);
});

test('actual locked native pg closure packages into an OFF Build Output v3 function',()=>{
  const root=REPOSITORY_ROOT;
  const output=join(root,'.vercel','scout-neon-smoke-ci-artifact');
  try {
    const r=prepareArtifact({root,output});
    assert.equal(r.manifestEnabled,false);
    assert.ok(r.pgClosure.length>=12);
    assert.ok(r.pgClosure.includes('pg-cloudflare'));
    assert.match(r.filesSha256,/^[0-9a-f]{64}$/);
    const entry=join(output,'functions/_ops/neon-smoke.func','handler.mjs');
    const require=createRequire(entry);
    assert.equal(require('pg/package.json').version,'8.23.1');
    assert.equal(typeof require('pg').Client,'function');
    assert.equal(JSON.parse(readFileSync(join(output,'functions/_ops/neon-smoke.func/approval.json'),'utf8')).enabled,false);
    const listing=readdirSync(join(output,'functions/_ops/neon-smoke.func'));
    assert.deepEqual(listing.filter(x=>x.startsWith('.env')||x==='.git'||x==='.neon'),[]);
  } finally {
    if (existsSync(output)) rmSync(output,{recursive:true,force:true});
  }
});
