// Genuine Chromium at mobile widths → real B handler → LOCAL native TLS/PG.
// Host/SSO/source/credentials are explicitly SYNTHETIC, not production/iPhone proof.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createServer} from 'node:https';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium} from '../../experiments/consumer-mvp/web/node_modules/playwright/index.mjs';
import {AxeBuilder} from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
import {fixture,base,head} from './fixtures.mjs';
import {continuousHandler} from '../../lib/scout-continuous/http.mjs';
import {controlHandler} from '../../lib/scout-continuous/control-document.mjs';
import {PROJECT} from '../../lib/live-ledger/http.mjs';
let f,browser,server,handler,certDir;
before(async()=>{
 f=await fixture();certDir=mkdtempSync(join(tmpdir(),'unfarmd-browser-tls-'));const key=join(certDir,'key'),cert=join(certDir,'cert');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=unfarmd.com','-addext','subjectAltName=DNS:unfarmd.com','-keyout',key,'-out',cert],{stdio:'ignore'});
 server=createServer({key:readFileSync(key),cert:readFileSync(cert)},(req,res)=>{Promise.resolve(handler(req,res)).catch(()=>{res.writeHead(500);res.end('{}');});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 browser=await chromium.launch({executablePath:process.env.CONSUMER_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server',`--host-resolver-rules=MAP unfarmd.com 127.0.0.1:${port}`]});
});
after(async()=>{await browser?.close();if(server)await new Promise(r=>server.close(r));await f?.close();if(certDir)rmSync(certDir,{recursive:true,force:true});});
const token='SYNTHETIC_OWNER_MOBILE_'+ 'x'.repeat(32),origin='https://unfarmd.com';
async function pageFor(width,{uncertain=false,denied=false}={}){
 const g=await f.reset();await f.assure(g);const worker=f.store(),c={...base(g),op:'claim'},r=await worker.transact(c),id=crypto.randomUUID();
 await worker.transact({...c,op:'beginChild',fence:r.fence,child:id,endsAt:new Date(Date.now()+60000).toISOString()});await worker.transact({...c,op:'reserve',fence:r.fence,child:id,resource:'connection'});
 const env={SCOUT_CONTINUOUS_CONTROL_ENABLED:'true',SCOUT_CONTINUOUS_API_ENABLED:'true',SCOUT_CONTINUOUS_CANONICAL_ENABLED:'true',SCOUT_CONTINUOUS_PROTECTION_REVIEW_SHA:head,SCOUT_CONTINUOUS_OWNER_TOKEN:token,VERCEL:'1',VERCEL_ENV:'production',VERCEL_PROJECT_ID:PROJECT,VERCEL_GIT_COMMIT_SHA:head,VERCEL_URL:'scout-stonk-intel-synthetic.vercel.app'};
 const handlers={reader:continuousHandler('reader',{env:()=>env,storeFactory:kind=>f.store(kind)}),stop:continuousHandler('stop',{env:()=>env,storeFactory:kind=>f.store(kind)})};
 const context=await browser.newContext({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500,ignoreHTTPSErrors:true}),page=await context.newPage(),calls=[];page.setDefaultTimeout(6000);page.on('pageerror',e=>console.error('LOCAL SCRIPT ERROR',e.message));
 handler=async(q,res)=>{
  const url=new URL(q.url,origin);if(q.headers.host!=='unfarmd.com'){res.writeHead(403);res.end('{}');return;}
  if(url.pathname==='/api/live-events/continuous/control'){const r=controlHandler({env:()=>env})(new Request(url,{headers:q.headers}));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());return;}
  const kind=url.pathname==='/api/live-events/continuous'?'reader':url.pathname==='/api/live-events/continuous/stop'?'stop':null;if(!kind){res.writeHead(404);res.end('{}');return;}
  calls.push(kind);if(denied){res.writeHead(403,{'content-type':'application/json'});res.end('{"error":"access_denied"}');return;}
  assert.equal(q.headers['sec-fetch-site'],'same-origin');if(kind==='stop')assert.equal(q.headers.origin,origin);
  const result=await handlers[kind](new Request(url,{method:q.method,headers:q.headers}));
  const status=uncertain&&kind==='stop'?503:result.status,body=uncertain&&kind==='stop'?'{}':await result.text();res.writeHead(status,Object.fromEntries(result.headers));res.end(body);
 };
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='unfarmd.com'?route.continue():route.abort());
 await page.goto(origin+'/api/live-events/continuous/control');
 return {page,context,calls,g,worker,command:{...c,fence:r.fence,child:id}};
}
for(const width of [320,390,1280])test(`actual parent read/permanent STOP at ${width}px, native SQL and accessible focus`,async()=>{
 const {page,context,calls,g,worker,command}=await pageFor(width);try{
  assert.deepEqual(calls,[]);assert.equal(await page.getByRole('button',{name:'Read parent',exact:true}).evaluate(n=>document.activeElement===n),true);
  await page.getByLabel('Private owner capability').fill(token);await page.getByRole('button',{name:'Read parent',exact:true}).click();await page.getByRole('status').filter({hasText:g.parent}).waitFor();assert.deepEqual(calls,['reader']);assert.equal(await page.getByLabel('Private owner capability').inputValue(),'');assert.equal(await page.getByRole('status').evaluate(n=>document.activeElement===n),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const axe=await new AxeBuilder({page}).include('#unfarmd-parent-console').analyze();assert.deepEqual(axe.violations.map(v=>v.id),[]);
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Permanently STOP parent',exact:true}).click();await page.getByRole('status').filter({hasText:'Permanent STOP committed.'}).waitFor();assert.deepEqual(calls,['reader','stop']);
  const state=await f.store('reader').transact(null);assert.equal(state.stopped,true);assert.equal(state.usage.connections,1);assert.equal(state.usage.credits,100);assert.equal((await worker.transact({...command,op:'reserve',resource:'rpc'})).ok,false);
  assert.equal(await page.getByRole('button',{name:'Permanently STOP parent',exact:true}).isDisabled(),true);assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);assert.ok(!page.url().includes(token));
  await page.evaluate(()=>{const note=document.createElement('aside');note.textContent='LOCAL SYNTHETIC QA · no provider traffic';note.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#fff4c4;color:#222;font:12px system-ui;text-align:center;padding:4px';document.body.append(note);});
  mkdirSync('docs/screenshots/continuous-local-qa',{recursive:true});await page.screenshot({path:`docs/screenshots/continuous-local-qa/parent-stop-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Close',exact:true}).click();assert.equal(await page.locator('#unfarmd-parent-console').count(),0);
 }finally{await context.close();}
});
test('authenticated-origin simulation rejects denied capability without exposing parent or issuing STOP',async()=>{
 const {page,context,calls}=await pageFor(390,{denied:true});try{await page.getByLabel('Private owner capability').fill(token);await page.getByRole('button',{name:'Read parent',exact:true}).click();await page.getByRole('status').filter({hasText:'Read unavailable or denied.'}).waitFor();assert.deepEqual(calls,['reader']);assert.equal(await page.getByRole('button',{name:'Permanently STOP parent',exact:true}).isDisabled(),true);}finally{await context.close();}
});
test('lost STOP response is uncertain: exactly one committed request, no retry or invented closure',async()=>{
 const {page,context,calls}=await pageFor(390,{uncertain:true});try{await page.getByLabel('Private owner capability').fill(token);await page.getByRole('button',{name:'Read parent',exact:true}).click();await page.getByRole('status').filter({hasText:'Credits reserved'}).waitFor();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Permanently STOP parent',exact:true}).click();await page.getByRole('status').filter({hasText:'STOP outcome uncertain.'}).waitFor();assert.deepEqual(calls,['reader','stop']);assert.equal(await page.getByRole('button',{name:'Read parent',exact:true}).isDisabled(),true);assert.equal((await f.store('reader').transact(null)).stopped,true);}finally{await context.close();}
});
