// Test-only composition authority: exact reviewed commits, never a runtime grant.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,lstatSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
export const BASE='eca3ad2dcead406f9aff32379c8a2bc7b0aa081f';
export const SOURCES={
 A:{sha:'0cb2fe813239fc81c73a6f38d2c2c4977ed00a41',diffSha256:'0958e6e4098fac81326d5d88d64df90b63543833d00e0bf478ec8d87b8b35b86'},
 B:{sha:'e045133c3cd94bf2be743e0c3fbdd12090212953',diffSha256:'5e282b8b3b18068616b9b2b12486575fd645318fceb028f8d999eaaea24d6325'},
 C:{sha:'6d978a468c9fb9ab6365a8d169866899acc13ba1',diffSha256:'c9fbee48266d1c88b73394f541830610384260abafd24bb68b1e9097e6eade39'}
};
export const INTEGRATION_FILES=['tests/continuous-ledger/scope.test.mjs','tests/live-release/contracts.test.mjs','tests/integration181/reviewed.json','tests/integration181/reviewed-scope.mjs','tests/integration181/composition.test.mjs','docs/operations/integration181.md'];
export const bytes=(...args)=>execFileSync('git',args,{maxBuffer:8*1024*1024});
export const git=(...args)=>bytes(...args).toString().trim();
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export const manifest=JSON.parse(readFileSync(new URL('./reviewed.json',import.meta.url),'utf8'));
export function committed(ref,path){
 const row=git('ls-tree',ref,'--',path);if(!row)return null;
 const [mode,type]=row.split('\t')[0].split(' ');assert.equal(type,'blob',path);
 return {mode,sha256:sha256(bytes('show',ref+':'+path))};
}
export function working(path){
 const s=lstatSync(path);assert.ok(s.isFile()&&!s.isSymbolicLink(),path);
 return {mode:s.mode&0o111?'100755':'100644',sha256:sha256(readFileSync(path))};
}
export function verifyReviewedInputs(){
 assert.equal(manifest.version,'scout-reviewed-composition/181');assert.equal(manifest.base,BASE);assert.deepEqual(manifest.sources,SOURCES);
 const expected=[];
 for(const [source,pin] of Object.entries(SOURCES)){
  assert.equal(git('merge-base',BASE,pin.sha),BASE,source);
  assert.equal(sha256(bytes('diff','--binary','--full-index','--no-renames',BASE,pin.sha)),pin.diffSha256,source+' source diff');
  assert.equal(git('merge-base','--is-ancestor',pin.sha,'HEAD'),'');
  for(const path of git('diff','--no-renames','--name-only',BASE,pin.sha).split('\n')){
   expected.push(path);assert.deepEqual(manifest.files[path],{source,before:committed(BASE,path),after:committed(pin.sha,path)},path);
  }
 }
 assert.equal(new Set(expected).size,expected.length,'no overlapping source edits');
 assert.deepEqual(Object.keys(manifest.files).sort(),expected.sort());
}
/** Exact old bytes AND exact new bytes/mode; an allowed name is not a wildcard. */
export function verifyDelta(changes,allowances){
 for(const {path,before,after} of changes){
  assert.ok(Object.hasOwn(allowances,path),'unreviewed delta: '+path);
  assert.deepEqual(before,allowances[path].before,'changed checkpoint: '+path);
  assert.deepEqual(after,allowances[path].after,'changed reviewed bytes/mode: '+path);
 }
}
export function assertReviewedTree(checkpoint,paths){
 const names=git('diff','--no-renames','--name-only',checkpoint,'--',...paths);
 assert.equal(git('ls-files','--others','--exclude-standard','--',...paths),'','untracked protected files');
 const changes=names?names.split('\n').map(path=>({path,before:committed(checkpoint,path),after:working(path)})):[];
 verifyDelta(changes,manifest.files);
}
