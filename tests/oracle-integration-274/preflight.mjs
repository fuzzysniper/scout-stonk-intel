// Offline preparation only. No network, provider, database, restore or activation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const BASE='8effe6ba0967d7a83e976840d5ed8df1d95fcbf5';
export const RECOVERY='09a11e700ea932c7b161664cdf5bbc9b3dcbe00b';
export const CLAIMS='0b342b7f2447e4ab07b09d9a8a36feb66daacbc9';
export const PAIR='01cf898e5e2b46e93c2a52c4d5bc2ecf5cca698d';
const SIGNATURE_PEER='a07479725f2aacecbec15dfd3b4ef8c712ac3277';
const OWN=[
 'docs/oracle-integration-274/acceptance.md',
 'tests/oracle-integration-274/preflight.mjs',
 'tests/oracle-integration-274/preflight.test.mjs',
].sort();
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');

/** Preparation guard, deliberately not final integration admission. C's next head is absent. */
export function reviewPreparation(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024});
 const git=(...a)=>raw(...a).toString().trim();
 const parents=ref=>git('show','-s','--format=%P',ref).split(' ');
 const tree=ref=>new Map(git('ls-tree','-r',ref).split('\n').map(line=>{
  const [meta,file]=line.split('\t'),[mode,type,id]=meta.split(' ');
  assert.equal(type,'blob',file);return [file,{mode,id}];
 }));
 const changes=ref=>git('diff','--name-only','--no-renames',BASE,ref).split('\n').filter(Boolean).sort();
 assert.deepEqual(parents(RECOVERY),[BASE]);
 assert.deepEqual(parents(CLAIMS),[SIGNATURE_PEER]);
 assert.deepEqual(parents(SIGNATURE_PEER),[BASE]);
 assert.equal(git('merge-base',RECOVERY,CLAIMS),BASE);
 assert.deepEqual(parents(PAIR),[CLAIMS,RECOVERY]);
 assert.equal(git('merge-base','--is-ancestor',PAIR,'HEAD'),'');
 const b=changes(RECOVERY),c=changes(CLAIMS),expected=tree(BASE);
 assert.equal(b.length,10);assert.equal(c.length,23);
 assert.equal(b.some(f=>c.includes(f)),false,'input path collision requires independent review');
 for(const [ref,files]of [[RECOVERY,b],[CLAIMS,c]]){
  const t=tree(ref);
  for(const f of files){assert.ok(t.has(f),'deletion not in reviewed input contract');expected.set(f,t.get(f));}
 }
 assert.deepEqual(tree(PAIR),expected,'complete pair tree, not just named paths');
 for(const [f,e]of expected){
  const file=path.join(root,f),s=fs.lstatSync(file);
  assert.ok(s.isFile()&&!s.isSymbolicLink(),f);
  assert.equal(s.mode&0o111?'100755':'100644',e.mode,f+' mode');
  assert.equal(blob(fs.readFileSync(file)),e.id,f+' reviewed bytes');
 }
 const actual=[...new Set([
  ...git('diff','--name-only','--no-renames',PAIR).split('\n'),
  ...git('ls-files','--others','--exclude-standard').split('\n'),
 ].filter(Boolean))].sort();
 assert.deepEqual(actual,OWN,'no broad integration-owned prefix allowance');
 for(const f of OWN){const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink()&&!(s.mode&0o111),f);assert.equal(expected.has(f),false);}
 return Object.freeze({status:'HOLD_AWAITING_TAKE_HEAD',activate:false,
  base:BASE,recovery:RECOVERY,claims:CLAIMS,pair:PAIR,take:null,
  changedPaths:{recovery:b,claims:c,preparation:OWN}});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(reviewPreparation(),null,2));process.exitCode=2;}
 catch{console.error('HOLD_INVALID_REVIEW_COMPOSITION');process.exitCode=1;}
}
