// Explicit, bounded manual QA only. Not imported by the app or automatic tests.
// Requires the already built Next app. No RPC, wallet, private defaults or credentials.
import {spawn} from 'node:child_process';
import {openSync,writeFileSync,mkdirSync} from 'node:fs';
import {chromium} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
if(process.env.CARDS_PUBLIC_READ_QA!=='approved')throw Error('Explicit bounded public-read QA opt-in required');
const dir='docs/consumer-v18-research',log=openSync('/tmp/scout-cards-public-next.log','w');mkdirSync(dir+'/screenshots',{recursive:true});
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4180'],{cwd:process.cwd(),detached:true,stdio:['ignore',log,log]});
let browser;let apiProof=null;const records=[],errors=[],sources=[];const startedAt=new Date().toISOString();
try{
 for(let n=0;n<100;n++){try{if((await fetch('http://127.0.0.1:4180')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 const proofResponse=await fetch('http://127.0.0.1:4180/api/pairs?quoteMint=CARDSccUMFKoPRZxt5vt3ksUbxEFEcnZ3H2pd3dKxYjp&discovery=pair');
 const proof=await proofResponse.json();apiProof={httpStatus:proofResponse.status,status:proof.status,coverage:proof.dataset?.coverage,sources:proof.dataset?.sources,history:proof.dataset?.history};
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:width===320?740:width===390?844:900}});const page=await context.newPage();const calls=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{const u=new URL(r.url());if(!['127.0.0.1','localhost'].includes(u.hostname))errors.push('Unexpected external browser request');if(u.pathname.startsWith('/api/'))calls.push(u.pathname+u.search);});
  page.on('response',r=>{if(new URL(r.url()).pathname==='/api/pairs')sources.push({width,httpStatus:r.status(),contentType:r.headers()['content-type']});});
  await page.goto('http://127.0.0.1:4180/');await page.getByRole('link',{name:'CARDS pair research',exact:true}).waitFor();await page.screenshot({path:dir+`/screenshots/after-home-${width}.png`});
  await page.getByRole('link',{name:'CARDS pair research',exact:true}).click();await page.locator('.cr-scope,.cr-error').first().waitFor({timeout:20000});await page.evaluate(()=>scrollTo(0,0));
  const findings=await page.locator('.cr-pair').count();const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();const first=findings?await page.locator('.cr-pair>details>summary').first().boundingBox():null;
  await page.screenshot({path:dir+`/screenshots/after-public-discovery-${width}.png`});
  if(findings){await page.locator('.cr-pair>details>summary').first().focus();await page.keyboard.press('Enter');await page.screenshot({path:dir+`/screenshots/after-public-evidence-${width}.png`,fullPage:true});await page.keyboard.press('Escape');}
  records.push({width,productionBuild:true,synthetic:false,rows:findings,calls,firstRow:first,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),axeViolations:axe.violations.map(v=>v.id),visibleConclusion:await page.locator('.cr-conclusion').innerText(),scope:await page.locator('.cr-scope').count()?await page.locator('.cr-scope').textContent():null,sourceFailure:await page.locator('.cr-error').count()?await page.locator('.cr-error').textContent():null});await context.close();
 }
 if(records.some(r=>r.overflow||r.axeViolations.length)||errors.length)throw Error('Public QA failed; see validation evidence');
}finally{
 await browser?.close();try{process.kill(-server.pid,'SIGTERM');}catch{}
 writeFileSync(dir+'/public-browser.json',JSON.stringify({startedAt,completedAt:new Date().toISOString(),scope:'Existing CARDS API only; 3 adjacent views share existing server cache. No retries, private tokens, RPC or financial publication.',apiProof,records,sources,errors},null,2)+'\n');
}
