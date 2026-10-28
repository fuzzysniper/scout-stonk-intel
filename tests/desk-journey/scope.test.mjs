import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,lstatSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const git=(...args)=>execFileSync('git',args,{maxBuffer:16*1024*1024}).toString().trim();
const bytes=(ref,path)=>execFileSync('git',['show',`${ref}:${path}`],{maxBuffer:16*1024*1024});
const MAIN='ba4b2e494f768350ec285e26791b61a90c50220b',OLD_BASE='9e5264b7edd3f37aeb35113ffb8b86aa8a50b7ec',INTEGRATION='d838cb138f9642a2b4a4572ddf432e5f7df9614b';
const added=['app/desk/journey/model.ts','app/desk/journey/controls.tsx','app/desk/journey/summary.tsx','app/desk/journey/desk-journey.tsx','app/desk/journey/journey.module.css','tests/desk-journey/adapter.test.mjs','tests/desk-journey/browser.spec.mjs','tests/desk-journey/scope.test.mjs','tests/desk-journey/playwright.config.mjs','tests/desk-journey/run.sh','tests/desk-journey/historical.sh','docs/v3/desk-journey.md',...['consider','risk','plan','pass'].flatMap(state=>['320','390','1280'].map(size=>`tests/desk-journey/screenshots/${state}-${size}.png`))];
test('exact #191 ancestry and every imported source byte/mode preserved except reviewed route and CI wiring',()=>{
 assert.equal(git('merge-base','--is-ancestor',INTEGRATION,'HEAD'),'');assert.equal(git('merge-base','--is-ancestor',MAIN,'HEAD'),'');
 const original=git('diff','--name-only',OLD_BASE,INTEGRATION).split('\n');assert.equal(original.length,61);
 for(const path of original){if(['app/desk/page.tsx','.github/workflows/desk-integration.yml'].includes(path))continue;
  assert.deepEqual(readFileSync(path),bytes(INTEGRATION,path),path);const stat=lstatSync(path);assert.ok(stat.isFile()&&!stat.isSymbolicLink());assert.equal(stat.mode&0o111?'100755':'100644',git('ls-tree',INTEGRATION,'--',path).split(' ')[0]);
 }
});
test('route switches only the desk component; chrome exception is exactly /desk, all other routes retain chrome',()=>{
 const oldRoute=bytes(INTEGRATION,'app/desk/page.tsx').toString();assert.equal(readFileSync('app/desk/page.tsx','utf8'),oldRoute.replace("import ManualDesk from './integration/manual-desk';","import DeskJourney from './journey/desk-journey';").replace('<ManualDesk/>','<DeskJourney/>'));
 const oldChrome=bytes(MAIN,'app/site-chrome.tsx').toString();assert.equal(readFileSync('app/site-chrome.tsx','utf8'),oldChrome.replace("pathname==='/' ||", "pathname==='/' || pathname==='/desk' ||"));
});
test('enumerated journey-only follow-up; every main collector/security/source/STOP/auth file is unchanged',()=>{
 const inherited=git('diff','--name-only',OLD_BASE,INTEGRATION).split('\n'),allowed=new Set([...inherited,...added,'app/site-chrome.tsx']);
 for(const path of [...git('diff','--name-only',MAIN).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))assert.ok(allowed.has(path),'unexpected '+path);
 const protectedPaths=['app/consumer','app/api','app/page.tsx','app/layout.tsx','app/globals.css','app/site-navigation.tsx','lib/onchain-mint','lib/live-ledger','lib/scout-live','lib/scout-continuous','experiments','data','scheduler','scripts','ops','neon.ts','next.config.ts','vercel.json','package.json','package-lock.json','tests/run.sh'];
 assert.equal(git('diff',MAIN,'--',...protectedPaths),'');
 for(const path of git('ls-tree','-r','--name-only',MAIN,'--','.github/workflows').split('\n'))assert.equal(git('diff',MAIN,'--',path),'',path);
});
test('journey has no I/O/storage/provider/secret/execution/unsafe-HTML capability or default market numbers',()=>{
 for(const path of added.filter(path=>path.startsWith('app/')&&/\.(ts|tsx)$/.test(path))){const text=readFileSync(path,'utf8');assert.doesNotMatch(text,/\b(?:fetch|WebSocket|XMLHttpRequest|localStorage|sessionStorage|indexedDB|process|dangerouslySetInnerHTML|eval)\b|document\.cookie|next\/(?:headers|server)|from ['"](?:pg|node:)/,path);}
});
