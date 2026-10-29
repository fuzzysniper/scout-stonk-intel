// Exact finite #229 dependent review. All parent runtime/data/source manifests remain byte/mode frozen.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
export const PARENT='6efb0eb66a79087b9c7a59b9a06ad584e9130ee9';
export const sha=b=>createHash('sha256').update(b).digest('hex');
const REVIEW_SHA='2339472632efba7408298c79c5c95538357862d147a5889e7e904595652bf585';
export function assertNativeScope(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:32*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const bytes=read('tests/v4-helius-native/review.json');assert.equal(sha(bytes),REVIEW_SHA,'immutable #232 review');const r=JSON.parse(bytes);assert.equal(r.parent,PARENT);assert.equal(git('merge-base','--is-ancestor',PARENT,'HEAD'),'');
 assert.deepEqual(Object.keys(r.modified).sort(),['tests/v4-owner-ledger/review.mjs','tests/v4-owner-ledger/scope.test.mjs']);
 const allowed=new Set([...r.added,...Object.keys(r.modified)]);assert.equal(allowed.size,r.added.length+Object.keys(r.modified).length);
 for(const line of git('ls-tree','-r',PARENT).split('\n')){const [entry,f]=line.split('\t'),[mode,type,blob]=entry.split(' ');assert.equal(type,'blob');const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111?'100755':'100644',mode,f);
  const b=read(f),m=r.modified[f];if(m){assert.equal(sha(raw('show',PARENT+':'+f)),m.originalSha256,f+' original');assert.equal(sha(b),m.reviewedSha256,f+' reviewed');assert.equal(sha(raw('diff','--binary','--full-index','--no-renames','--no-ext-diff','--no-textconv',PARENT,'--',f)),m.patchSha256,f+' exact patch');}
  else assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),blob,f+' frozen #229');
 }
 for(const f of r.added){const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111,0,f);}
 for(const [f,h] of Object.entries(r.newFiles))assert.equal(sha(read(f)),h,f+' exact new bytes');
 assert.deepEqual(Object.keys(r.newFiles).sort(),r.added.filter(f=>!['tests/v4-helius-native/review.json','tests/v4-helius-native/review.mjs','tests/v4-helius-native/scope.test.mjs'].includes(f)).sort());
 for(const f of [...git('diff','--name-only','--no-renames',PARENT).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))assert.ok(allowed.has(f),'unreviewed #232 path:'+f);
 return JSON.parse(read('tests/v4-private-integration/review.json'));
}
