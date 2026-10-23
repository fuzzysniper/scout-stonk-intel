import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';

const mint='So11111111111111111111111111111111111111112';
const output='docs/consumer-release-166';

test('integrated optimized app submits only deliberate GET and displays real source denial',async({page},info)=>{
 const calls=[],external=[],errors=[];
 page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))calls.push({method:r.method(),path:u.pathname});if(!['127.0.0.1','localhost'].includes(u.hostname))external.push(u.host);});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 await page.goto('/?mint='+mint);await page.waitForLoadState('networkidle');
 expect(calls).toEqual([]);
 await expect(page.getByRole('heading',{name:'Onchain check not requested',exact:true})).toBeVisible();
 if(await page.locator('#mint').isHidden())await page.getByRole('button',{name:'Search another token',exact:true}).click();
 await page.locator('#mint').fill(mint);
 const responsePromise=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/mint-facts');
 await page.getByRole('button',{name:'SCOUT IT',exact:true}).click();
 const response=await responsePromise,body=await response.json();
 expect(response.status()).toBe(403);expect(body.reason).toBe('access_denied');
 expect(body.facts).toBeNull();expect(body.source).toBeNull();
 await expect(page.locator('.brief-status')).toHaveText('Check not permitted');
 await expect(page.locator('.mint-supply,.mint-authorities,.control-receipt')).toHaveCount(0);
 expect(calls).toEqual([{method:'GET',path:'/api/mint-facts'}]);
 expect(external).toEqual([]);expect(errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 mkdirSync(output+'/screenshots',{recursive:true});
 await page.screenshot({path:`${output}/screenshots/denied-${info.project.name}.png`});
 writeFileSync(`${output}/denied-${info.project.name}.json`,JSON.stringify({viewport:page.viewportSize(),httpStatus:response.status(),reason:body.reason,facts:body.facts,source:body.source,apiCalls:calls,externalRequests:external,pageErrors:errors,scope:'Actual optimized localhost app and unchanged backend handler; no origin spoof, API fixture, RPC or proof POST. Local origin denial is not canonical-production disabled/protection proof.'},null,2)+'\n');
});

test('hosting authentication HTML stays an access denial without login navigation or proof fallback',async({page})=>{
 const calls=[];page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))calls.push({method:r.method(),path:u.pathname});});
 // Failure-only transport fixture; never an accepted/live-data demo.
 await page.route('**/api/mint-facts?*',r=>r.fulfill({status:401,contentType:'text/html',body:'<!doctype html><title>Hosting authentication required</title>'}));
 await page.goto('/');await page.locator('#mint').fill(mint);await page.locator('#mint').press('Enter');
 await expect(page.locator('.brief-status')).toHaveText('Check not permitted');
 await expect(page.locator('.mint-supply,.mint-authorities,.control-receipt')).toHaveCount(0);
 expect(calls).toEqual([{method:'GET',path:'/api/mint-facts'}]);
 await page.reload();await page.waitForLoadState('networkidle');
 await expect(page.getByRole('heading',{name:'Onchain check not requested',exact:true})).toBeVisible();
 expect(calls).toHaveLength(1);expect(new URL(page.url()).pathname).toBe('/');
});
