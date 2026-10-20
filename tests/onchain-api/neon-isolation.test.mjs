// SYNTHETIC, OFFLINE control-plane/ZIP fixtures only. No Vercel, Neon or Helius requests.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {snapshot,compareSnapshots,verifySnapshot,TEAM_ID,PROTECTED_ALIASES} from '../../scripts/ops/neon-alias-guard.mjs';
import {prepareArtifact} from '../../scripts/ops/build-neon-smoke-artifact.mjs';
import {EXPECTED} from '../../scripts/ops/scout-neon-smoke.mjs';
const zipTool=resolve('scripts/ops/neon-artifact-zip.py');
const hash=b=>createHash('sha256').update(b).digest('hex');
const copy=v=>structuredClone(v);
function raw() {
  return {project:{id:EXPECTED.vercelProjectId,name:'scout-stonk-intel',accountId:TEAM_ID,
    nodeVersion:'24.x',ssoProtection:{enabled:true,deploymentType:'all_except_custom_domains'}},
    aliases:{aliases:PROTECTED_ALIASES.map(alias=>({alias,deploymentId:'dpl_SYNTHETICProduction',projectId:EXPECTED.vercelProjectId})),
      pagination:{count:4,next:null}},
    domains:{domains:PROTECTED_ALIASES.slice(0,2).map(name=>({name,projectId:EXPECTED.vercelProjectId,gitBranch:null,customEnvironmentId:null,redirect:null})),
      pagination:{count:2,next:null}}};
}
test('all four aliases, project/domain identity and protection are captured independent of response ordering',()=>{
  const a=raw(),b=copy(a);b.aliases.aliases.reverse();b.domains.domains.reverse();
  assert.equal(snapshot(a).sha256,snapshot(b).sha256);
  assert.equal(compareSnapshots(snapshot(a),snapshot(b)).unchanged,true);
  assert.equal(snapshot(a).aliases.length,4);
});
test('the real incident shape: only team alias reassignment fails the guard',()=>{
  const a=raw(),b=copy(a);b.aliases.aliases.find(a=>a.alias==='scout-stonk-intel-riskledgerapp.vercel.app').deploymentId='dpl_SYNTHETICSmoke';
  assert.throws(()=>snapshot(b),/alias_safety_unproven/);
  assert.throws(()=>compareSnapshots(snapshot(a),{...snapshot(a),sha256:'0'.repeat(64)}));
});
test('domain mapping changes fail even when alias targets are unchanged',()=>{
  for(const patch of [{gitBranch:'smoke'},{customEnvironmentId:'env_SYNTHETIC'},{redirect:'https://example.invalid'}]) {
    const a=raw(),b=copy(a);Object.assign(b.domains.domains[0],patch);
    assert.throws(()=>snapshot(b));
  }
});
test('errors, missing/incomplete pagination, missing aliases and duplicate records cannot appear safe',()=>{
  for(const mutate of [r=>{delete r.aliases;},r=>{delete r.aliases.pagination;},
    r=>{r.aliases.pagination.next=123;},r=>{r.domains.pagination.next=123;},
    r=>{r.aliases.aliases.pop();r.aliases.pagination.count--;},
    r=>{r.aliases.aliases[1]=r.aliases.aliases[0];},r=>{r.aliases.pagination.count=0;},
    r=>{r.aliases={error:'unauthenticated'};},r=>{r.domains.domains[0].projectId='prj_other';}]) {
    const r=raw();mutate(r);assert.throws(()=>snapshot(r));
  }
});
test('wrong team/project/runtime, changed SSO and forged checksums fail closed',()=>{
  for(const patch of [{id:'prj_other'},{accountId:'team_other'},{name:'other'},
    {nodeVersion:'22.x'},{ssoProtection:null},{ssoProtection:{enabled:true,deploymentType:'preview'}}]) {
    const r=raw();Object.assign(r.project,patch);assert.throws(()=>snapshot(r));
  }
  const s=snapshot(raw());s.aliases[0].deploymentId='dpl_Tampered';assert.throws(()=>verifySnapshot(s));
});
test('unlisted alias additions/removals or production releases require a new baseline and approval',()=>{
  const a=raw(),b=copy(a);
  b.aliases.aliases.push({alias:'new-preview.example.invalid',deploymentId:'dpl_New',projectId:EXPECTED.vercelProjectId});
  b.aliases.pagination.count++;
  assert.throws(()=>compareSnapshots(snapshot(a),snapshot(b)));
  const c=raw();for(const a of c.aliases.aliases)a.deploymentId='dpl_NewProduction';
  assert.throws(()=>compareSnapshots(snapshot(a),snapshot(c)));
});
function fixture() {
  const root=mkdtempSync(join(tmpdir(),'scout-isolation-synthetic-'));
  const file=(p,data)=>{mkdirSync(join(root,p,'..'),{recursive:true});writeFileSync(join(root,p),data);};
  file('scripts/ops/neon-smoke-handler.mjs','export default function synthetic(){}\n');
  file('scripts/ops/scout-neon-smoke.mjs','export const syntheticOnly=true;\n');
  file('.gitignore','node_modules/\n.vercel/\n*.zip\n');
  for(const [name,version]of [['pg','8.23.1'],['pg-protocol','1.0.0']]) {
    file('node_modules/'+name+'/package.json',JSON.stringify({name,version}));
    file('node_modules/'+name+'/index.js','module.exports={syntheticOnly:true};\n');
  }
  file('package-lock.json',JSON.stringify({packages:{'node_modules/pg':{version:'8.23.1',dependencies:{'pg-protocol':'1.0.0'}},
    'node_modules/pg-protocol':{version:'1.0.0'}}}));
  execFileSync('git',['init','--quiet'],{cwd:root});execFileSync('git',['add','.'],{cwd:root});
  execFileSync('git',['-c','user.name=Synthetic','-c','user.email=synthetic@example.invalid','commit','--quiet','-m','synthetic fixture'],{cwd:root});
  return {root,file,close:()=>rmSync(root,{recursive:true,force:true})};
}
test('installed dependencies must match exact lock versions before output exists',()=>{
  const f=fixture();try{
    f.file('node_modules/pg/package.json','{"name":"pg","version":"0.0.0"}');
    assert.throws(()=>prepareArtifact({root:f.root}),/installed_dependency_lock_mismatch/);
  }finally{f.close();}
});
test('symlinked output ancestors cannot escape the reviewed workspace',()=>{
  const f=fixture(),outside=mkdtempSync(join(tmpdir(),'scout-outside-'));
  try {symlinkSync(outside,join(f.root,'.vercel'));assert.throws(()=>prepareArtifact({root:f.root}),/unsafe_output_ancestor/);}
  finally {f.close();rmSync(outside,{recursive:true,force:true});}
});
test('symlinked dependencies, env files and recognized credential bytes are rejected',()=>{
  for(const mutate of [f=>symlinkSync('/etc/hosts',join(f.root,'node_modules/pg/escape')),
    f=>f.file('node_modules/pg/.env.local','SYNTHETIC=1'),
    f=>f.file('node_modules/pg/secret.txt','-----BEGIN PRIVATE KEY-----\nSYNTHETIC\n'),
    f=>f.file('node_modules/pg/url.txt','https://mainnet.helius-rpc.com/?api-key=SYNTHETIC_ONLY'),
    f=>f.file('node_modules/pg/oversized',Buffer.alloc(1048577)),
    f=>{for(let i=0;i<17;i++)f.file('node_modules/pg/pad-'+i,Buffer.alloc(1048576));}]) {
    const f=fixture();try{mutate(f);assert.throws(()=>prepareArtifact({root:f.root}));}finally{f.close();}
  }
});
test('dirty or falsely pinned sources cannot produce an armed artifact',()=>{
  const f=fixture();try{
    const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:f.root,encoding:'utf8'}).trim();
    const approval={enabled:true,operationId:'scout-neon-synthetic-operation',reviewedCommitSha:sha,startMs:1000,endMs:2000};
    assert.throws(()=>prepareArtifact({root:f.root,armed:true,approval,reviewedCommitSha:'0'.repeat(40)}),/unreviewed_source/);
    f.file('scripts/ops/neon-smoke-handler.mjs','export default function changed(){}');
    assert.throws(()=>prepareArtifact({root:f.root,armed:true,approval,reviewedCommitSha:sha}),/unreviewed_source/);
  }finally{f.close();}
});
test('ZIP bytes and inventory are deterministic and independently verified; corruption fails',()=>{
  const f=fixture();try{
    const result=prepareArtifact({root:f.root}),one=join(f.root,'one.zip'),two=join(f.root,'two.zip');
    const pack=p=>JSON.parse(execFileSync('python3',[zipTool,'pack',result.output,p],{encoding:'utf8'}));
    const a=pack(one),b=pack(two);assert.equal(a.zipSha256,b.zipSha256);
    assert.equal(a.filesSha256,result.filesSha256);assert.deepEqual(readFileSync(one),readFileSync(two));
    const args=[zipTool,'verify',one,a.zipSha256,a.filesSha256,a.sourceCommit];
    assert.equal(JSON.parse(execFileSync('python3',args,{encoding:'utf8'})).verified,true);
    const raw=readFileSync(one);raw[raw.length-1]^=1;writeFileSync(one,raw);
    const bad=spawnSync('python3',args,{encoding:'utf8'});assert.equal(bad.status,1);assert.doesNotMatch(bad.stderr,/Traceback|password/);
  }finally{f.close();}
});
test('ZIP verification rejects traversal, symlinks, duplicate names, armed manifest and wrong runtime even with a supplied matching ZIP digest',()=>{
  const f=fixture();try{
    const result=prepareArtifact({root:f.root}),clean=join(f.root,'clean.zip');
    const good=JSON.parse(execFileSync('python3',[zipTool,'pack',result.output,clean],{encoding:'utf8'}));
    for(const mode of ['traversal','symlink','duplicate','armed','runtime','trailer']) {
      const bad=join(f.root,mode+'.zip');
      execFileSync('python3',['-c',`
import sys,zipfile
source,dest,mode=sys.argv[1:]
with zipfile.ZipFile(source) as src, zipfile.ZipFile(dest,'w') as out:
 for info in src.infolist():
  data=src.read(info)
  if info.filename.endswith('approval.json'):
   if mode=='traversal': info.filename='.vercel/output/../../escape'
   if mode=='symlink': info.external_attr=(0o120777 << 16)
   if mode=='armed': data=b'{"enabled":true}'
   if mode=='duplicate': out.writestr(info,data)
  if info.filename.endswith('.vc-config.json') and mode=='runtime': data=b'{"runtime":"nodejs22.x"}'
  out.writestr(info,data)
if mode=='trailer':
 with open(dest,'ab') as f: f.write(b'SYNTHETIC_HIDDEN_PAYLOAD')
`,clean,bad,mode],{stdio:'pipe'});
      const r=spawnSync('python3',[zipTool,'verify',bad,hash(readFileSync(bad)),good.filesSha256,good.sourceCommit],{encoding:'utf8'});
      assert.equal(r.status,1,mode);assert.doesNotMatch(r.stderr,/Traceback|password/);
    }
  }finally{f.close();}
});
