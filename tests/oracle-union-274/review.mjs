// Integration-owned finite review. Every original reviewer remains immutable.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export const BASE='8effe6ba0967d7a83e976840d5ed8df1d95fcbf5';
export const TAKE='3316612ce256f9827b88e6272c3cec9fefb3f79b';
export const RECOVERY='09a11e700ea932c7b161664cdf5bbc9b3dcbe00b';
export const PREPARATION='94cadce1b6831d03fc58b89477353311a356ed53';
const CLAIMS='0b342b7f2447e4ab07b09d9a8a36feb66daacbc9';
const PAIR='01cf898e5e2b46e93c2a52c4d5bc2ecf5cca698d';
const MANIFEST_SHA='4b06beb2836963c5e60143e0148c4207410d3af0a01b40a462c7fe4d74da6b44';
export const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export function review(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024});
 const git=(...a)=>raw(...a).toString().trim();
 const read=f=>fs.readFileSync(path.join(root,f));
 const tree=ref=>new Map(git('ls-tree','-r',ref).split('\n').map(line=>{const[meta,f]=line.split('\t'),[mode,type,id]=meta.split(' ');assert.equal(type,'blob',f);return[f,{mode,id}];}));
 const parents=ref=>git('show','-s','--format=%P',ref).split(' ');
 const bytes=read('tests/oracle-union-274/review.json');assert.equal(sha(bytes),MANIFEST_SHA);
 const m=JSON.parse(bytes);assert.equal(m.base,BASE);assert.deepEqual(m.parents,[TAKE,RECOVERY,PREPARATION]);
 assert.deepEqual(parents('HEAD'),m.parents,'exact independent union parents');
 assert.deepEqual(parents(TAKE),[CLAIMS]);assert.deepEqual(parents(RECOVERY),[BASE]);
 assert.deepEqual(parents(PREPARATION),[PAIR]);assert.deepEqual(parents(PAIR),[CLAIMS,RECOVERY]);
 assert.equal(git('merge-base',TAKE,RECOVERY),BASE);
 const expected=tree(BASE),used=new Set();
 for(const [i,source]of m.sources.entries()){
  assert.equal(source.sha,m.parents[i]);assert.equal(git('rev-parse',source.sha+'^{tree}'),source.tree);
  assert.equal(source.from,i===2?PAIR:BASE);assert.equal(git('merge-base','--is-ancestor',source.sha,'HEAD'),'');
  const changes=git('diff','--name-only','--no-renames',source.from,source.sha).split('\n').filter(Boolean).sort();
  assert.deepEqual(changes,source.changes.map(c=>c.path));
  assert.equal(sha(raw('diff','--binary','--full-index','--no-ext-diff','--no-textconv','--no-renames',source.from,source.sha)),source.patchSha256);
  const before=tree(source.from),after=tree(source.sha);
  for(const c of source.changes){assert.equal(used.has(c.path),false,c.path+' source collision');used.add(c.path);assert.deepEqual(before.get(c.path)??null,c.before);assert.deepEqual(after.get(c.path),c.after);assert.ok(c.after);expected.set(c.path,c.after);}
 }
 for(const [f,e]of expected){const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111?'100755':'100644',e.mode,f+' mode');assert.equal(blob(read(f)),e.id,f+' immutable source blob');}
 const changed=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();
 assert.deepEqual(changed,[...used,...Object.keys(m.added)].sort(),'complete actual working-tree delta');
 const head=tree('HEAD');assert.deepEqual([...head.keys()].sort(),[...expected.keys(),...Object.keys(m.added)].sort(),'complete committed HEAD tree');
 for(const [f,e]of expected)assert.deepEqual(head.get(f),e,f+' exact HEAD source blob');
 for(const [f,e]of Object.entries(m.added)){assert.equal(expected.has(f),false);const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111?'100755':'100644',e.mode,f);if(e.sha256)assert.equal(sha(read(f)),e.sha256,f+' integration byte pin');}
 return m;
}
