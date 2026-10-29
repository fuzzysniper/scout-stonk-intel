// Exact review of H + immutable J/P inputs. No environment/path-prefix waiver.
import assert from 'node:assert/strict';
import {assertSlice,BASE as SLICE_BASE} from '../v4-thesis/review.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export const H='b56475c681311d35f95ee9879d9969b868a1724e';
export const INPUTS={J:'d2c4a64d6b13bd9e1ffe609b50d88f6ab581d99e',P:'ffcef289ddee14b46d17cb6223eb21bcbfed42cf'};
export const COMPOSITION_ADDED=['tests/v4-private-integration/review.mjs','tests/v4-private-integration/review.json','tests/v4-private-integration/scope.test.mjs','tests/v4-private-integration/run.sh','tests/v4-private-integration/source-history.sh','docs/v4/private-integration-225.md','.github/workflows/v4-private-integration.yml'];
const REVIEW_SHA='2237e8d3c8f41504fa14888507697725f0253f39d57c2d22f887cbf7344ff9a0';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function assertComposition(root=process.cwd()){
 const dependent=assertSlice(root);
 const raw=(...args)=>{
  // Only named replacement patches use their immutable226 versions below.
  // assertSlice has already checked the actual replacement bytes + complete diff.
  if(args[0]==='diff'&&args.indexOf('--')===args.length-2&&dependent.exceptions.includes(args.at(-1))){args.splice(args.indexOf('--'),0,SLICE_BASE);}
  return execFileSync('git',args,{cwd:root,maxBuffer:32*1024*1024});
 },git=(...a)=>raw(...a).toString().trim(),read=p=>dependent.exceptions.includes(p)?execFileSync('git',['show',SLICE_BASE+':'+p],{cwd:root}):fs.readFileSync(path.join(root,p));
 const bytes=read('tests/v4-private-integration/review.json');assert.equal(sha(bytes),REVIEW_SHA,'immutable composition review');const review=JSON.parse(bytes);
 assert.equal(review.base,H);assert.deepEqual(review.inputs,INPUTS);assert.deepEqual(review.added,COMPOSITION_ADDED);
 for(const ref of [H,...Object.values(INPUTS)])assert.equal(git('merge-base','--is-ancestor',ref,'HEAD'),'');
 const inputPaths=new Set();
 for(const [name,ref] of Object.entries(INPUTS)){
  assert.equal(git('merge-base',H,ref),H);assert.equal(git('rev-list','--parents','-n','1',ref),ref+' '+H,'exact original sole parent');
  const files=git('diff','--name-only','--no-renames',H,ref).split('\n');assert.deepEqual(Object.keys(review.sources[name]).sort(),files.sort());
  for(const file of files){inputPaths.add(file);const [mode,type,blob]=git('ls-tree',ref,'--',file).split('\t')[0].split(' ');assert.equal(type,'blob');assert.deepEqual(review.sources[name][file],{mode,blob,sha256:sha(raw('show',ref+':'+file))});}
 }
 const allowed=new Set([...inputPaths,...COMPOSITION_ADDED,...dependent.additions,...dependent.exceptions]);
 for(const file of inputPaths){
  const resolution=review.resolutions[file];
  if(resolution){
   assert.equal(sha(read(file)),resolution.reviewedSha256,file+' reviewed resolution bytes');
   for(const [name,ref] of Object.entries({H,...INPUTS})){if(!review.sources[name]?.[file]&&name!=='H')continue;const exists=git('ls-tree',ref,'--',file);if(!exists)continue;
    assert.deepEqual(resolution.from[name],{originalSha256:sha(raw('show',ref+':'+file)),patchSha256:sha(raw('diff','--binary','--full-index','--no-renames','--no-ext-diff','--no-textconv',ref,'--',file))},file+' complete '+name+' patch');}
  }else{const candidates=Object.values(review.sources).filter(s=>s[file]).map(s=>s[file]);assert.ok(candidates.length);for(const s of candidates)assert.equal(sha(read(file)),s.sha256,file+' immutable input bytes');}
 }
 assert.deepEqual(Object.keys(review.resolutions).sort(),['.github/workflows/v4-helius-pilot-offline.yml','tests/v4-integration/assertions.mjs','tests/v4-integration/scope.test.mjs','tests/v4-private-journal/dependency.mjs','tests/v4-private-journal/scope.test.mjs','tests/v4-helius-pilot/review.mjs','tests/v4-helius-pilot/scope.test.mjs'].sort());
 // All H paths, including the unchanged A/B/C manifest, exceptions and data,
 // remain byte/mode exact unless the ORIGINAL P/J inventory names that path.
 for(const line of git('ls-tree','-r',H).split('\n')){
  const [entry,file]=line.split('\t'),[mode,type,blob]=entry.split(' ');assert.equal(type,'blob');const st=fs.lstatSync(path.join(root,file));assert.ok(st.isFile()&&!st.isSymbolicLink(),file);assert.equal(st.mode&0o111?'100755':'100644',mode,file);
  if(!inputPaths.has(file)){const content=read(file);assert.equal(createHash('sha1').update('blob '+content.length+'\0').update(content).digest('hex'),blob,file+' frozen base');}
 }
 for(const file of allowed){const st=fs.lstatSync(path.join(root,file));assert.ok(st.isFile()&&!st.isSymbolicLink(),file);assert.equal(st.mode&0o111,0,file);}
 for(const file of [...git('diff','--name-only','--no-renames',H).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))assert.ok(allowed.has(file),'unreviewed composition path:'+file);
 assert.equal(git('diff',H,'--','.',...Array.from(allowed,f=>':(exclude)'+f)),'');
 for(const [file,pin] of Object.entries(review.newFiles))assert.equal(sha(read(file)),pin,file+' reviewed new bytes');
 return review;
}
