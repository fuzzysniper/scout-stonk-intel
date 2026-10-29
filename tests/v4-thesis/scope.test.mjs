import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {assertSlice,BASE,EXCEPTIONS,ADDITIONS} from './review.mjs';
test('exact226 ancestry, all original source/code/data/modes +five finite full patches and30 additions',()=>{assertSlice();assert.equal(EXCEPTIONS.length,5);assert.equal(ADDITIONS.length,30);});
for(const f of ['lib/v4-private-journal/index.ts','lib/v4-private-journal/repository.ts','lib/v4-private-journal/auth.ts','lib/v4-helius-pilot/server/index.ts','lib/onchain-mint/server/lookup-policy.ts','data/reward-snapshots.json',...EXCEPTIONS])test('passing control then reject source/guard/private/OFF tamper '+f,()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'thesis228-negative-'));try{execFileSync('git',['clone','--shared',process.cwd(),root],{stdio:'ignore'});assertSlice(root);fs.appendFileSync(path.join(root,f),'\nUNREVIEWED\n');assert.throws(()=>assertSlice(root));}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('installed routes import only OFF entry; no auth/provider/storage/test wiring or env flag',()=>{
 for(const f of ['app/api/v4/theses/route.ts','app/api/v4/theses/[journalId]/route.ts']){const s=fs.readFileSync(f,'utf8');assert.match(s,/installedThesisRoute/);assert.doesNotMatch(s,/createThesisHandler|process|repository|owner-context|fixture|fetch|require/);}
 assert.doesNotMatch(fs.readFileSync('lib/v4-thesis-api/installed.ts','utf8'),/process|from |require|fetch|Owner|Postgres/);
 assert.deepEqual(fs.readFileSync('app/lens/page.tsx'),execFileSync('git',['show',BASE+':app/lens/page.tsx']));
});
