// Finite dependent #222 scope; never a directory-wide exemption or environment bypass.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const BASE='b56475c681311d35f95ee9879d9969b868a1724e';
export const EXCEPTIONS=['tests/v4-integration/assertions.mjs','tests/v4-integration/scope.test.mjs'];
export const ADDITIONS=[
 'lib/v4-private-journal/index.ts','lib/v4-private-journal/contract.ts','lib/v4-private-journal/validation.ts','lib/v4-private-journal/auth.ts',
 'lib/v4-private-journal/crypto.ts','lib/v4-private-journal/schema.sql','lib/v4-private-journal/repository.ts',
 'tests/v4-private-journal/run.sh','tests/v4-private-journal/fixtures.mjs','tests/v4-private-journal/security.test.mjs','tests/v4-private-journal/postgres.test.mjs',
 'tests/v4-private-journal/dependency.mjs','tests/v4-private-journal/scope.test.mjs','tests/v4-private-journal/dependency.json',
 'tests/v4-private-journal/__init__.py','tests/v4-private-journal/engine_test.py',
 'docs/v4/private-journal-222.md','.github/workflows/private-journal.yml'];
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function assertJournalScope(root=process.cwd()){
 const raw=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:16*1024*1024}),git=(...args)=>raw(...args).toString().trim(),read=p=>fs.readFileSync(path.join(root,p));
 assert.equal(git('merge-base','--is-ancestor',BASE,'HEAD'),'');
 const manifest=JSON.parse(read('tests/v4-private-journal/dependency.json'));assert.equal(manifest.base,BASE);assert.deepEqual(manifest.additions,ADDITIONS);
 assert.deepEqual(Object.keys(manifest.exceptions).sort(),[...EXCEPTIONS].sort());
 for(const file of EXCEPTIONS){const delta=manifest.exceptions[file];
  assert.equal(delta.originalSha256,sha(raw('show',BASE+':'+file)));
  assert.equal(delta.reviewedSha256,sha(read(file)));
  assert.equal(delta.patchSha256,sha(raw('diff','--binary','--full-index','--no-renames','--no-ext-diff','--no-textconv',BASE,'--',file)));
 }
 for(const file of ADDITIONS){const stat=fs.lstatSync(path.join(root,file));assert.ok(stat.isFile()&&!stat.isSymbolicLink(),file);assert.equal(stat.mode&0o111,0,file);}
 const allowed=new Set([...ADDITIONS,...EXCEPTIONS]);
 for(const file of [...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))assert.ok(allowed.has(file),'unreviewed_journal_path:'+file);
 for(const line of git('diff','--name-status','--no-renames',BASE).split('\n').filter(Boolean)){const [status,file]=line.split('\t');assert.ok((EXCEPTIONS.includes(file)&&status==='M')||(ADDITIONS.includes(file)&&status==='A'),line);}
 assert.equal(git('diff',BASE,'--','.',...Array.from(allowed,f=>':(exclude)'+f)),'');
 for(const file of EXCEPTIONS)assert.equal(git('ls-files','-s','--',file).split(' ')[0],'100644');
 return ADDITIONS;
}
