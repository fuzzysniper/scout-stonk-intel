// Finite #228 dependent patch. Live replacements are hash/patch-pinned before
// the original #226 composition reviewer checks their immutable input versions.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='4af9532709c3a9bca9efe71356124328955a2877';
export const EXCEPTIONS=['app/lens/view.tsx','tests/v4-integration/assertions.mjs','tests/v4-private-integration/review.mjs','tests/v4-private-integration/scope.test.mjs','tests/v4-private-journal/scope.test.mjs'];
export const ADDITIONS=['app/lens/journal-controls.tsx','app/api/v4/theses/route.ts','app/api/v4/theses/[journalId]/route.ts',
 'lib/v4-thesis-api/owner-context.ts','lib/v4-thesis-api/client-contract.ts','lib/v4-thesis-api/installed.ts','lib/v4-thesis-api/handler.ts','lib/v4-thesis-api/rate.ts','lib/v4-thesis-api/rate.sql',
 'tests/v4-thesis/fixture.mjs','tests/v4-thesis/api.test.mjs','tests/v4-thesis/browser-entry.tsx','tests/v4-thesis/browser-server.mjs','tests/v4-thesis/css-loader.cjs','tests/v4-thesis/browser.spec.mjs','tests/v4-thesis/playwright.config.mjs','tests/v4-thesis/run.sh','tests/v4-thesis/__init__.py','tests/v4-thesis/engine_test.py',
 'tests/v4-thesis/review.mjs','tests/v4-thesis/review.json','tests/v4-thesis/scope.test.mjs','tests/v4-thesis/source-history.sh','tests/v4-thesis/built-off.mjs',
 'tests/v4-thesis/screenshots/local-save-history-320.png','tests/v4-thesis/screenshots/local-save-history-390.png','tests/v4-thesis/screenshots/local-save-history-1280.png',
 'docs/v4/thesis-save-228.md','.github/workflows/thesis-save.yml'];
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function assertSlice(root=process.cwd()){
 const raw=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:32*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 assert.equal(git('merge-base','--is-ancestor',BASE,'HEAD'),'');const m=JSON.parse(read('tests/v4-thesis/review.json'));
 assert.equal(m.base,BASE);assert.deepEqual(m.additions,ADDITIONS);assert.deepEqual(Object.keys(m.exceptions).sort(),[...EXCEPTIONS].sort());
 for(const f of EXCEPTIONS){const d=m.exceptions[f];assert.equal(d.originalSha256,sha(raw('show',BASE+':'+f)));assert.equal(d.reviewedSha256,sha(read(f)),f);assert.equal(d.patchSha256,sha(raw('diff','--binary','--full-index','--no-ext-diff','--no-textconv','--no-renames',BASE,'--',f)),f+' full patch');}
 for(const line of git('ls-tree','-r',BASE).split('\n')){const [entry,f]=line.split('\t'),[mode,type,blob]=entry.split(' '),st=fs.lstatSync(path.join(root,f));assert.equal(type,'blob');assert.ok(st.isFile()&&!st.isSymbolicLink(),f);assert.equal(st.mode&0o111?'100755':'100644',mode,f);if(!EXCEPTIONS.includes(f)){const b=read(f);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),blob,f+' frozen226');}}
 const allowed=new Set([...EXCEPTIONS,...ADDITIONS]);for(const f of ADDITIONS){const st=fs.lstatSync(path.join(root,f));assert.ok(st.isFile()&&!st.isSymbolicLink());assert.equal(st.mode&0o111,0,f);}
 for(const f of [...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))assert.ok(allowed.has(f),'unreviewed228:'+f);
 assert.equal(git('diff',BASE,'--','.',...Array.from(allowed,f=>':(exclude,literal)'+f)),'');return {additions:ADDITIONS,exceptions:EXCEPTIONS};
}
