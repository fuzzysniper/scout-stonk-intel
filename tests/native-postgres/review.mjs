// Finite B-only delta on exact284. Existing guards/installers/A/C/source bytes remain immutable.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
export const BASE='905f5e68a2d53a3d1e54747e0b4a9632e96b0f8a';
export const sha=b=>createHash('sha256').update(b).digest('hex');const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export function review(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const m=JSON.parse(read('tests/native-postgres/review.json'));assert.equal(m.base,BASE);assert.equal(git('rev-parse',BASE+'^{tree}'),'4aa53abb86b8168a03aa34356e52716b8a963834');assert.equal(git('merge-base','--is-ancestor',BASE,'HEAD'),'');
 const original=new Map();for(const line of git('ls-tree','-r',BASE).split('\n')){const[meta,f]=line.split('\t'),[mode,type,id]=meta.split(' ');assert.equal(type,'blob');original.set(f,{mode,id});const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111?'100755':'100644',mode,f);
  if(m.modified[f]){assert.equal(sha(read(f)),m.modified[f].sha256,f);assert.equal(sha(raw('diff','--no-ext-diff','--no-textconv','--binary','--full-index','--no-renames',BASE,'--',f)),m.modified[f].patchSha256,f);}else assert.equal(blob(read(f)),id,f+' immutable284');}
 assert.deepEqual(Object.keys(m.modified).sort(),['lib/native-pilot/index.ts','vercel.json']);
 const expected=JSON.parse(raw('show',BASE+':vercel.json'));expected.git.deploymentEnabled['feat/284-native-postgres-off']=false;assert.deepEqual(JSON.parse(read('vercel.json')),expected);
 const before=raw('show',BASE+':lib/native-pilot/index.ts').toString(),after=read('lib/native-pilot/index.ts').toString();
 assert.equal(after,before.replace("import {openLedger,type AnchorBootstrap} from './ledger';","import type {NativePostgresConfiguration} from './postgres/connection';\nimport type {Ledger} from './ledger';")
 .replace('policy:Policy;directory:string;anchorDirectory:string;bootstrap:AnchorBootstrap;','policy:Policy;store:NativePostgresConfiguration;')
 .replace(' const p=policy(config.policy);need(identity(p));const ledger=openLedger({...config,policy:p});',` const p=policy(config.policy);need(identity(p));
 // Loader cache only, never admission state. No PG import/credential construction before owner verification.
 let opened:Promise<Ledger>|undefined;
 const store=()=>opened??=import('./postgres/connection').then(m=>m.openPostgresLedger(p,config.store));
 const ledger:Ledger={inspect:async()=> (await store()).inspect(),reserve:async(...a)=> (await store()).reserve(...a),
  finish:async(...a)=> (await store()).finish(...a),stop:async(...a)=> (await store()).stop(...a)};`),'only storage assembly changes; full fixed wire/identity/owner/STOP remain');
 const changed=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(changed,[...Object.keys(m.modified),...Object.keys(m.added)].sort());
 assert.deepEqual(Object.entries(m.added).filter(([,x])=>!x.sha256).map(([f])=>f).sort(),['tests/native-postgres/review.json','tests/native-postgres/review.mjs','tests/native-postgres/scope.test.mjs']);
 for(const[f,v]of Object.entries(m.added)){assert.equal(original.has(f),false);assert.match(f,/^(lib\/native-pilot\/postgres\/|tests\/native-postgres\/|\.github\/workflows\/native-postgres.yml$)/);const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink());assert.equal(s.mode&0o111?'100755':'100644',v.mode,f);if(v.sha256)assert.equal(sha(read(f)),v.sha256,f);}
 assert.match(read('lib/native-pilot/index.ts').toString(),/NATIVE_PILOT_ENABLED=false/);assert.match(read('tests/native-postgres/pg18-approval.mjs').toString(),/LOCAL_PG18_APPROVAL=null/);assert.match(read('.github/workflows/native-postgres.yml').toString(),/local-pg18-NOT-AUTHORIZED:\n\s+if: \$\{\{ false \}\}/);
 if(git('rev-parse','HEAD')!==BASE){assert.equal(git('show','-s','--format=%P','HEAD'),BASE,'one dependent commit');for(const line of git('ls-tree','-r','HEAD').split('\n')){const[meta,f]=line.split('\t'),[mode,,id]=meta.split(' ');assert.equal(blob(read(f)),id,f+' committed bytes');assert.equal(fs.statSync(path.join(root,f)).mode&0o111?'100755':'100644',mode,f);}}
 return m;
}
