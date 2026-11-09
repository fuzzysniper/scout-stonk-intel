// Additive packaging review. Original #291 reviewer is replayed, never edited or skipped.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='06046d1909ce39e9808cff91075e51ddbe776b31';
export const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export function review(root=process.cwd(),committed=true){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const m=JSON.parse(read('tests/native-beta-output/review.json'));assert.equal(m.base,BASE);assert.equal(git('rev-parse',BASE+'^{tree}'),'eba9c9b2d2a2f8163ad9e8670e3fdfea0a7fa339');
 const modified=['.github/workflows/native-beta-release.yml','.github/workflows/native-pilot-admission.yml','vercel.json'];assert.deepEqual(Object.keys(m.modified).sort(),modified);
 const originals=new Map(git('ls-tree','-r',BASE).split('\n').map(s=>{const [a,p]=s.split('\t');return [p,a.split(' ')];}));
 for(const [p,[mode,,id]]of originals){const st=fs.lstatSync(path.join(root,p));assert.ok(st.isFile()&&!st.isSymbolicLink(),p);assert.equal(st.mode&0o111?'100755':'100644',mode,p);if(!modified.includes(p))assert.equal(blob(read(p)),id,p+' frozen original');}
 for(const [p,x]of Object.entries({...m.modified,...m.added})){assert.ok(modified.includes(p)||/^(?:ops|tests)\/native-beta-output\//.test(p)||p==='.github/workflows/native-beta-output.yml');const st=fs.lstatSync(path.join(root,p));assert.ok(st.isFile()&&!st.isSymbolicLink(),p);assert.equal(st.mode&0o111?'100755':'100644',x.mode,p);if(x.sha256)assert.equal(sha(read(p)),x.sha256,p+' pinned packaging bytes');if(m.modified[p])assert.equal(sha(raw('diff','--binary','--full-index','--no-ext-diff','--no-textconv','--no-renames',BASE,'--',p)),x.patchSha256,p+' pinned patch');}
 assert.deepEqual(Object.entries(m.added).filter(([,x])=>x.sha256===null).map(([p])=>p).sort(),['tests/native-beta-output/review.json','tests/native-beta-output/review.mjs','tests/native-beta-output/scope.test.mjs']);
 const changed=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(changed,[...Object.keys(m.modified),...Object.keys(m.added)].sort(),'finite packaging-only delta');
 // Remove only our separately pinned additive mode; byte-compare every old job and permission.
 let w=read('.github/workflows/native-pilot-admission.yml').toString().split('\n  preview-context:')[0];w=w.replace(', preview-output] ','] ').replace(', preview-output]',']');
 w=w.replace(/      preview_starts_at:[\s\S]*?(?=permissions:)/,'');w=w.replace("if: inputs.mode != 'preview-output' && ",'if: ').replace("    if: inputs.mode != 'preview-output'\n    needs: context",'    needs: context');w=w.replace(/\n+$/,'\n');assert.equal(w,raw('show',BASE+':.github/workflows/native-pilot-admission.yml').toString());
 let ci=read('.github/workflows/native-beta-release.yml').toString();ci=ci.replace(', native-pilot/private-beta-rc]',']').replaceAll(" || github.head_ref == 'ops/291-build-output-packet'",'').replaceAll('tests/native-beta-output/scope.test.mjs','tests/native-beta-release/scope.test.mjs');assert.equal(ci,raw('show',BASE+':.github/workflows/native-beta-release.yml').toString(),'every original CI command/job retained');
 const v=JSON.parse(raw('show',BASE+':vercel.json'));v.git.deploymentEnabled['ops/291-build-output-packet']=false;assert.deepEqual(JSON.parse(read('vercel.json')),v);
 if(committed){assert.equal(git('show','-s','--format=%P','HEAD'),BASE,'one ordinary dependent commit');for(const line of git('ls-tree','-r','HEAD').split('\n')){const [a,p]=line.split('\t');assert.equal(blob(read(p)),a.split(' ')[2],p+' committed bytes');}}
 return m;
}
