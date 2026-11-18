// Exact reviewed source composition. No path-wide exclusions or runtime permissions.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const bytes=(...args)=>execFileSync('git',args,{maxBuffer:16*1024*1024});
const git=(...args)=>bytes(...args).toString().trim();
const hash=v=>createHash('sha256').update(v).digest('hex');
const manifest=JSON.parse(readFileSync('tests/desk-integration/source-manifest.json','utf8'));
const BASE='9e5264b7edd3f37aeb35113ffb8b86aa8a50b7ec';
const sources={C:'b05095fcc6a0ea7cc9e0a0b4d15ffeb248184005',A:'65c42e8ee41f165c273a5bdcfaa8c63f84bce4bb',B:'36ede0e45046d8dba5a5163cc57ebc94434e2513'};
const extras=['app/desk/integration/model.ts','app/desk/integration/manual-desk.tsx','app/desk/integration/manual-desk.module.css','tests/desk-integration/adapter.test.mjs','tests/desk-integration/fixtures.mjs','tests/desk-integration/scope.test.mjs','tests/desk-integration/source-manifest.json','tests/desk-integration/run.sh','tests/desk-integration/engines.sh','tests/desk-integration/browser.spec.mjs','tests/desk-integration/playwright.config.mjs','docs/v3/desk-integration.md','.github/workflows/desk-integration.yml',...['empty','plan','pass'].flatMap(state=>['320','390','1280'].map(size=>`tests/desk-integration/screenshots/${state}-${size}.png`))];
test('39 exact reviewed input files/parents; 38 unchanged bytes plus ONE pinned route delta',()=>{
 assert.equal(manifest.base,BASE);assert.deepEqual(manifest.sources,sources);const paths=[];
 for(const [source,sha] of Object.entries(sources)){
  assert.equal(git('merge-base',BASE,sha),BASE);assert.equal(git('merge-base','--is-ancestor',sha,'HEAD'),'');
  for(const path of git('diff','--name-only','--no-renames',BASE,sha).split('\n')){
   paths.push(path);const [mode,type,blob]=git('ls-tree',sha,'--',path).split('\t')[0].split(' ');assert.equal(type,'blob');
   assert.deepEqual(manifest.files[path],{source,mode,blob,sha256:hash(bytes('show',sha+':'+path))},path+' original');
   const stat=lstatSync(path);assert.ok(stat.isFile()&&!stat.isSymbolicLink());assert.equal(stat.mode&0o111?'100755':'100644',mode);
   assert.equal(hash(readFileSync(path)),path==='app/desk/page.tsx'?manifest.routeException.reviewedAfterSha256:manifest.files[path].sha256,path+' aggregate');
  }
 }
 assert.equal(paths.length,39);assert.equal(new Set(paths).size,39);assert.deepEqual(Object.keys(manifest.files).sort(),paths.sort());
 assert.equal(manifest.routeException.path,'app/desk/page.tsx');assert.equal(manifest.routeException.reviewedAfterSha256,'f4e4ed7f9b8d1fede27315b78ce1c89d0970c2a05bb8706b76a205f90614f54e');
 const patch=bytes('diff','--binary','--full-index','--no-renames','--no-ext-diff','--no-textconv',sources.C,'--','app/desk/page.tsx');
 assert.equal(hash(patch),manifest.routeException.patchSha256);
});
test('only enumerated integration files; core homepage/auth/CSP/STOP/SQL/TLS/sources/data/workflows freeze to main',()=>{
 const allowed=new Set([...Object.keys(manifest.files),...extras]);
 for(const p of [...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))assert.ok(allowed.has(p),'unreviewed file: '+p);
 const protectedPaths=['app/consumer','app/api','app/page.tsx','app/layout.tsx','app/globals.css','app/site-chrome.tsx','lib/onchain-mint','lib/live-ledger','lib/scout-live','lib/scout-continuous','experiments','data','scheduler','ops','neon.ts','next.config.ts','package.json','package-lock.json','tests/run.sh'];
 assert.equal(git('diff',BASE,'--',...protectedPaths),'');
 for(const p of git('ls-tree','-r','--name-only',BASE,'--','.github/workflows').split('\n'))assert.equal(git('diff',BASE,'--',p),'',p);
 assert.notEqual(git('merge-base','fb07947be8f10902fdba52ee7b148d11c32654ef','HEAD'),'fb07947be8f10902fdba52ee7b148d11c32654ef','unexpected #182 ancestry');
});
test('new desk has no provider, storage, secret, execution or unsafe HTML capability',()=>{
 for(const path of ['app/desk/integration/model.ts','app/desk/integration/manual-desk.tsx']){
  const text=readFileSync(path,'utf8');assert.doesNotMatch(text,/\b(?:fetch|WebSocket|XMLHttpRequest|localStorage|sessionStorage|indexedDB|process|dangerouslySetInnerHTML|eval)\b|document\.cookie|next\/(?:headers|server)|from ['"](?:pg|node:)/,path);
 }
});
