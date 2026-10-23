// Run only against the unchanged latest-main production build, before editing UI.
import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import {MINT,AT,mintFixture} from './trader-fixtures.mjs';
import {capture,labelOfflineReplay} from './unfarmd-capture.mjs';
const SI='DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP';
test('capture actual SCOUT V3 production baseline without provider traffic',async({page},info)=>{
 const external=[],methods=[];page.on('request',r=>{if(!['localhost','127.0.0.1'].includes(new URL(r.url()).hostname))external.push(r.url());if(new URL(r.url()).pathname.startsWith('/api/'))methods.push(r.method());});
 await page.route('**/*',r=>!['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.abort():r.continue());
 await page.route('**/api/token?*',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
 await page.goto('/');await expect(page.locator('.wordmark')).toContainText('SCOUT');await capture(page,'before-idle',info);
 await page.goto('/?mint='+MINT);await expect(page.locator('.brief-status')).toHaveText('Check not permitted');await capture(page,'before-actual-denied',info);
 await page.goto('/?mint='+SI);await expect(page.locator('#answer-title')).toContainText('Super Inu');await capture(page,'before-historical',info);
 await page.clock.install({time:new Date(AT)});
 await page.route('**/api/mint-facts?*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mintFixture(MINT,{freeze:true,extensions:true}))}));
 await page.goto('/?mint='+MINT);await expect(page.locator('.brief-status')).toHaveText('RPC snapshot accepted');await labelOfflineReplay(page);await capture(page,'before-offline-replay',info);
 expect(external).toEqual([]);expect(methods.every(m=>m==='GET')).toBe(true);
});
