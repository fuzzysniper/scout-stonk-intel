// Finite native-only prospective trust delta. Original keys/verifiers/signed lanes stay immutable.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='80d952c73bf4529fd04034c85985c16898ab17e8';export const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export function review(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const m=JSON.parse(read('tests/native-admission/review.json'));assert.equal(m.base,BASE);assert.equal(git('rev-parse',BASE+'^{tree}'),'f66dd5ced8ae0c873e91e412302e4a9527de6674');git('merge-base','--is-ancestor',BASE,'HEAD');
 const allowed=['app/api/native-pilot/route.ts','lib/native-lens/boundary.ts','lib/native-pilot/index.ts','lib/native-pilot/postgres/connection.ts','tests/native-postgres/pg18.test.mjs','vercel.json'];assert.deepEqual(Object.keys(m.modified).sort(),allowed.sort());
 for(const line of git('ls-tree','-r',BASE).split('\n')){const[meta,f]=line.split('\t'),[mode,,id]=meta.split(' '),s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111?'100755':'100644',mode,f);if(!m.modified[f])assert.equal(blob(read(f)),id,f+' immutable288');}
 const delta=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(delta,[...Object.keys(m.modified),...Object.keys(m.added)].sort());
 for(const[f,v]of Object.entries({...m.modified,...m.added})){if(m.added[f])assert.match(f,/^(lib\/native-pilot\/admission\/|tests\/native-admission\/|ops\/native-pilot-admission\/|\.github\/workflows\/native-admission.yml$)/);const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink());assert.equal(s.mode&0o111?'100755':'100644',v.mode,f);if(v.sha256)assert.equal(sha(read(f)),v.sha256,f);}
 assert.deepEqual(Object.entries(m.added).filter(([,v])=>!v.sha256).map(([f])=>f).sort(),['tests/native-admission/review.json','tests/native-admission/review.mjs','tests/native-admission/scope.test.mjs']);
 const vercel=JSON.parse(raw('show',BASE+':vercel.json'));vercel.git.deploymentEnabled['feat/288-native-release-admission']=false;assert.deepEqual(JSON.parse(read('vercel.json')),vercel);
 assert.match(read('lib/native-pilot/index.ts').toString(),/NATIVE_PILOT_ENABLED=false/);assert.match(read('lib/native-pilot/index.ts').toString(),/NATIVE_PILOT_BUILD[^=]*=null/);assert.match(read('lib/native-lens/policy.ts').toString(),/NATIVE_LENS_SOURCE_ENABLED=false/);assert.match(read('lib/native-pilot/admission/gates.ts').toString(),/NATIVE_SETUP_RUNTIME_ENABLED=false/);for(const name of ['PLAN','BUILD'])assert.match(read('lib/native-pilot/admission/installed.ts').toString(),new RegExp('NATIVE_ADMISSION_'+name+'[^=]*=null'));
 assert.match(read('lib/native-pilot/admission/configuration.ts').toString(),/resources=false \/\* NATIVE_CONFIGURATION_ENABLED \*\//);
 assert.doesNotMatch(read('lib/native-pilot/postgres/connection.ts').toString(),/verifyNeonAdmission|OWNER_RELEASE_PUBLIC_KEY_PEM|durabilityEnvelope/);
 if(git('rev-parse','HEAD')!==BASE){assert.equal(git('show','-s','--format=%P','HEAD'),BASE);for(const line of git('ls-tree','-r','HEAD').split('\n')){const[meta,f]=line.split('\t'),[mode,,id]=meta.split(' ');assert.equal(blob(read(f)),id,f+' committed bytes');assert.equal(fs.statSync(path.join(root,f)).mode&0o111?'100755':'100644',mode,f);}}
 return m;
}
