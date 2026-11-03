// NEW finite delta. Every original281 blob/mode is immutable except one exact suppression entry.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const BASE='ca36baba5f8d8d2d2002bcdf6e3672c2c97aa7e5',A='a1f9a9e0d5c3336098c5750b14b738acaec66372';
const sha=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const raw=(...args)=>execFileSync('git',args,{maxBuffer:64*1024*1024}),git=(...args)=>raw(...args).toString().trim();
test('exact281 ancestry and full immutable tree, exact A types, finite files; no signed-lane or deployment change',()=>{
 const m=JSON.parse(fs.readFileSync('tests/native-pilot/review.json'));assert.equal(m.base,BASE);assert.equal(git('rev-parse',BASE+'^{tree}'),'59603d673d96ee75f469a8611f1fd983f324dfba');assert.equal(git('merge-base','--is-ancestor',BASE,'HEAD'),'');
 const original=new Map();for(const line of git('ls-tree','-r',BASE).split('\n')){const[meta,f]=line.split('\t'),[mode,type,id]=meta.split(' ');assert.equal(type,'blob');original.set(f,{mode,id});const s=fs.lstatSync(f);assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111?'100755':'100644',mode,f);if(f==='vercel.json')continue;assert.equal(blob(fs.readFileSync(f)),id,f+' immutable281');}
 const expected=JSON.parse(raw('show',BASE+':vercel.json'));expected.git.deploymentEnabled['feat/281-native-pilot-off']=false;assert.deepEqual(JSON.parse(fs.readFileSync('vercel.json')),expected);
 assert.equal(sha(fs.readFileSync('vercel.json')),m.vercelSha256);assert.equal(sha(raw('diff','--no-ext-diff','--no-textconv','--binary','--full-index','--no-renames',BASE,'--','vercel.json')),m.vercelPatchSha256);
 const changed=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(changed,['vercel.json',...Object.keys(m.added)].sort());
 assert.deepEqual(Object.entries(m.added).filter(([,v])=>v.sha256===null).map(([f])=>f).sort(),['tests/native-pilot/review.json','tests/native-pilot/scope.test.mjs']);
 for(const[f,v]of Object.entries(m.added)){assert.equal(original.has(f),false);assert.match(f,/^(lib\/native-pilot\/|tests\/native-pilot\/|\.github\/workflows\/native-pilot\.yml$)/);const s=fs.lstatSync(f);assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111?'100755':'100644',v.mode,f);if(v.sha256)assert.equal(sha(fs.readFileSync(f)),v.sha256,f+' reviewed bytes');}
 assert.deepEqual(fs.readFileSync('lib/native-pilot/evidence-contract.ts'),raw('show',A+':lib/native-evidence/contract.ts'),'A owns these exact types');
 const source=fs.readFileSync('lib/native-pilot/index.ts','utf8');assert.match(source,/export const NATIVE_PILOT_ENABLED=false;/);assert.match(source,/export const NATIVE_PILOT_BUILD:Readonly<\{commit:string;tree:string\}>\|null=null;/);
 // No acquisition/auth/store imports into an old route, client, API or signed authority.
 for(const f of original.keys())if(/\.(ts|tsx|mjs)$/.test(f))assert.doesNotMatch(fs.readFileSync(f,'utf8'),/from\s+['"][^'"]*native-pilot|import\(['"][^'"]*native-pilot/);
 if(git('rev-parse','HEAD')!==BASE){assert.equal(git('show','-s','--format=%P','HEAD'),BASE,'one dependent commit');for(const line of git('ls-tree','-r','HEAD').split('\n')){const[meta,f]=line.split('\t'),[mode,,id]=meta.split(' ');assert.equal(blob(fs.readFileSync(f)),id,f+' committed bytes');assert.equal(fs.lstatSync(f).mode&0o111?'100755':'100644',mode,f);}}
});
