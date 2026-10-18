import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
import {writeFileSync} from 'node:fs';
const mint='So11111111111111111111111111111111111111112',si='DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP';
const fail=(reason='disabled',status='unavailable')=>({version:'mint-facts/1',status,mint,facts:null,source:null,reason,warnings:[]});
const errors=new WeakMap(),outbound=new WeakMap();
test.beforeEach(async({page})=>{const e=[],o=[];errors.set(page,e);outbound.set(page,o);page.on('pageerror',v=>e.push(v.message));page.on('console',v=>{if(v.type()==='error'&&!(v.text().startsWith('Failed to load resource')&&v.location().url.includes('/api/mint-facts')))e.push(v.text());});page.on('request',r=>{if(!['127.0.0.1','localhost'].includes(new URL(r.url()).hostname))o.push(r.url());});});
test.afterEach(async({page})=>{expect(errors.get(page)).toEqual([]);expect(outbound.get(page)).toEqual([]);});
const axe=async page=>expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
test('real production missing/disabled route stays honest, SSR and no-JS never supply facts',async({page,browser,request},info)=>{
 await page.goto('/?mint='+mint);await expect(page.getByRole('heading',{name:'Source not connected',exact:true})).toBeVisible();await expect(page.locator('.mint-supply')).toHaveCount(0);
 await expect(page.getByText('No accepted observation',{exact:true})).toBeVisible();await expect(page.getByText('Unavailable',{exact:true})).toBeVisible();await axe(page);
 await page.screenshot({path:`docs/consumer-v14-ux/screenshots/production-disabled-${info.project.name}.png`});
 const nojs=await browser.newContext({javaScriptEnabled:false});const p=await nojs.newPage();await p.goto('http://127.0.0.1:4180/?mint='+mint);await expect(p.locator('.mint-ssr-note')).toContainText('Onchain facts have not loaded');expect(await p.locator('.mint-supply').count()).toBe(0);await nojs.close();
 const r=await request.get('/?mint='+mint);expect(r.status()).toBe(200);expect(await r.text()).not.toContain('18446744073.709551615');expect(await page.locator('script').allTextContents()).not.toContain('18446744073.709551615');
 const fixtureRoute=await request.get('/consumer/harness');expect(fixtureRoute.status()).toBe(404);
});
test('fixed contract errors, unsupported 404, clipboard fallback and deep-link identity',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);
 await page.route('**/api/mint-facts?*',r=>r.fulfill({status:404,contentType:'application/json',body:JSON.stringify(fail('not_mint','not_a_supported_mint_account'))}));
 await page.goto('/?mint='+mint);await expect(page.getByRole('heading',{name:'Not a supported mint account',exact:true})).toBeVisible();await expect(page.locator('.mint-supply')).toHaveCount(0);
 await page.getByRole('button',{name:'Copy address link',exact:true}).click();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(page.url());
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true}));await page.getByRole('button',{name:'Copy address link',exact:true}).click();await expect(page.getByLabel('Copy this address link',{exact:true})).toBeFocused();
 await page.getByLabel('Token address',{exact:true}).fill(si);await expect(page.locator('.mint-details')).toContainText(mint);await page.getByLabel('Token address',{exact:true}).press('Enter');await expect(page.getByRole('heading',{name:/^Super Inu/})).toBeFocused();
 await expect(page.locator('.answer-card')).toContainText('14 Oct 2026');await expect(page.locator('.mint-historical-status')).toContainText('14 Oct 2026');
 await page.goBack();await expect(page.getByRole('heading',{name:'Not a supported mint account',exact:true})).toBeVisible();await expect(page.getByLabel('Token address',{exact:true})).toHaveValue(mint);
});
test('429 cooldown, 503 and malformed API do not become mint observations',async({page})=>{
 let calls=0;await page.route('**/api/mint-facts?*',r=>{calls++;return r.fulfill({status:429,headers:{'retry-after':'2'},contentType:'application/json',body:JSON.stringify(fail('rate_limited'))});});
 await page.goto('/?mint='+mint);await expect(page.getByRole('heading',{name:'Check paused',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Wait before checking again',exact:true})).toBeDisabled();expect(calls).toBe(1);
 await expect(page.getByRole('button',{name:'Check again',exact:true})).toBeEnabled();expect(calls).toBe(1);await page.getByRole('button',{name:'Check again',exact:true}).click();await expect.poll(()=>calls).toBe(2);
 await page.unroute('**/api/mint-facts?*');await page.route('**/api/mint-facts?*',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify(fail('upstream_unavailable'))}));await page.reload();await expect(page.getByRole('heading',{name:'Check could not complete',exact:true})).toBeVisible();
 await page.unroute('**/api/mint-facts?*');await page.route('**/api/mint-facts?*',r=>r.fulfill({contentType:'application/json',body:'{"version":"mint-facts/1","status":"verified_onchain_mint_at_slot"}'}));await page.reload();await expect(page.getByRole('heading',{name:'Could not verify this response',exact:true})).toBeVisible();expect(await page.locator('.mint-supply').count()).toBe(0);await axe(page);
});
test('query flags cannot enable synthetic facts and draft/address sharing stays exact',async({page})=>{
 await page.goto('/?mint='+mint+'&fixture=verified&activation=enabled&rpc=https://rpc.invalid');await expect(page.getByRole('heading',{name:'Source not connected',exact:true})).toBeVisible();expect(await page.locator('.mint-supply').count()).toBe(0);
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);await page.getByRole('button',{name:'Copy address link',exact:true}).click();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(new URL('/?mint='+mint,page.url()).href);
 await page.evaluate(()=>{function strip(sheet){for(const rule of [...sheet.cssRules]){if(rule.selectorText?.includes(':has('))sheet.deleteRule([...sheet.cssRules].indexOf(rule));else if(rule.cssRules)strip(rule);}}for(const sheet of document.styleSheets)strip(sheet);});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 writeFileSync('experiments/consumer-mvp/web/node_modules/.cache/mint107-production-no-facts.json',JSON.stringify({displayedFacts:false,externalRequests:outbound.get(page)}));
});
