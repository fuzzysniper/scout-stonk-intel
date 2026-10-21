import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
const mint='So11111111111111111111111111111111111111112',si='DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP';
const fail=(reason='disabled')=>({version:'mint-facts/1',status:'unavailable',mint,facts:null,source:null,reason,warnings:[]});
const axe=async page=>expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
const issues=new WeakMap();
test.beforeEach(async({page})=>{await page.route('**/api/token?*',r=>r.fulfill({status:503,contentType:'application/json',headers:{'retry-after':'60'},body:'{}'}));const e=[];issues.set(page,e);page.on('pageerror',x=>e.push(x.message));page.on('console',x=>{if(x.type()==='error'&&!(x.text().startsWith('Failed to load resource')&&/\/api\/(mint-facts|token)/.test(x.location().url)))e.push(x.text());});page.on('request',r=>{if(!['localhost','127.0.0.1'].includes(new URL(r.url()).hostname))e.push('unexpected external request');});});
test.afterEach(async({page})=>expect(issues.get(page)).toEqual([]));
const input=page=>page.getByLabel('Token address',{exact:true});
const paste=page=>page.getByRole('button',{name:'Paste token address',exact:true});
async function disabledApi(page){let calls=0;await page.route('**/api/mint-facts?*',r=>{calls++;return r.fulfill({status:503,contentType:'application/json',body:JSON.stringify(fail())});});return()=>calls;}

test('explicit real Chromium clipboard gesture preserves exact input, with no automatic source request',async({page,context},info)=>{
 const calls=await disabledApi(page);await context.grantPermissions(['clipboard-read','clipboard-write']);await page.goto('/');
 await page.evaluate(async text=>{await navigator.clipboard.writeText(text);const read=navigator.clipboard.readText.bind(navigator.clipboard);window.testClipboardReads=0;Object.defineProperty(navigator.clipboard,'readText',{configurable:true,value:()=>{window.testClipboardReads++;return read();}});},mint);
 expect(await page.evaluate(()=>window.testClipboardReads)).toBe(0);expect(calls()).toBe(0);await paste(page).click();await expect(input(page)).toHaveValue(mint);await expect(page.locator('#paste-status')).toContainText('Choose SCOUT IT');expect(calls()).toBe(0);expect(new URL(page.url()).search).toBe('');expect(await page.evaluate(()=>window.testClipboardReads)).toBe(1);
 const box=await paste(page).boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);await axe(page);await page.screenshot({path:`experiments/consumer-mvp/web/node_modules/.cache/v17-regression-screenshots/after-paste-${info.project.name}.png`});
 await input(page).press('Enter');await expect(page.getByRole('heading',{name:'Source not connected',exact:true})).toBeVisible();expect(calls()).toBe(1);expect(new URL(page.url()).searchParams.get('mint')).toBe(mint);
 // No whitespace cleanup, URL extraction or partial-address truncation.
 await page.evaluate(text=>navigator.clipboard.writeText(text),' '+si);await paste(page).click();await expect(input(page)).toHaveValue(' '+si);await page.getByRole('button',{name:'SCOUT IT',exact:true}).click();await expect(page.getByRole('heading',{name:'That doesn’t look like a token address',exact:true})).toBeVisible();expect(calls()).toBe(1);
 await page.evaluate(()=>navigator.clipboard.writeText('x'.repeat(121)));await paste(page).click();await expect(page.locator('#paste-status')).toContainText('too long');await expect(input(page)).toHaveValue(' '+si);expect(calls()).toBe(1);
});

test('clipboard denial and unsupported API offer native paste fallback, 16px input and Go key',async({page},info)=>{
 const calls=await disabledApi(page);await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:async()=>{throw new DOMException('Denied','NotAllowedError');}}}));await page.goto('/');
 await paste(page).click();await expect(input(page)).toBeFocused();await expect(page.locator('#paste-status')).toContainText('Touch and hold');expect(calls()).toBe(0);expect(await input(page).evaluate(n=>parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(16);await expect(input(page)).toHaveAttribute('enterkeyhint','go');await expect(input(page)).toHaveAttribute('autocorrect','off');await axe(page);
 await page.screenshot({path:`experiments/consumer-mvp/web/node_modules/.cache/v17-regression-screenshots/after-native-paste-help-${info.project.name}.png`});
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined}));await paste(page).click();await expect(input(page)).toBeFocused();await expect(page.locator('#paste-status')).toContainText('You can also type');
 await input(page).fill(mint);await input(page).press('Enter');await expect(page.getByRole('heading',{name:'Source not connected',exact:true})).toBeVisible();expect(calls()).toBe(1);
});

test('delayed clipboard cannot replace typing or a newly selected exact-mint example',async({page})=>{
 const calls=await disabledApi(page);await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:()=>new Promise(resolve=>{window.finishTestPaste=resolve;})}}));await page.goto('/');
 await paste(page).click();await expect(paste(page)).toBeDisabled();await input(page).fill(si);await page.evaluate(value=>window.finishTestPaste(value),mint);await expect(input(page)).toHaveValue(si);expect(calls()).toBe(0);
 await paste(page).click();await page.getByRole('button',{name:/Explain Super Inu/}).click();await expect(page.getByRole('heading',{name:/^Super Inu/})).toBeVisible();await page.evaluate(value=>window.finishTestPaste(value),mint);await expect(input(page)).toHaveValue(si);expect(new URL(page.url()).searchParams.get('mint')).toBe(si);await expect(page.locator('.answer-card')).toContainText('14 Oct 2026');expect(calls()).toBe(1);
});

test('same-address explicit submission retries after cooldown without background requests',async({page})=>{
 await page.clock.install({time:new Date('2026-10-18T12:00:00.000Z')});let calls=0;
 await page.route('**/api/mint-facts?*',r=>{calls++;return r.fulfill({status:calls===1?429:503,headers:{'retry-after':'2'},contentType:'application/json',body:JSON.stringify(fail(calls===1?'rate_limited':'disabled'))});});
 await page.goto('/?mint='+mint);await expect(page.getByRole('button',{name:'Check again in 2s',exact:true})).toBeDisabled();expect(calls).toBe(1);await page.clock.fastForward(1001);await expect(page.getByRole('button',{name:'Check again in 1s',exact:true})).toBeDisabled();expect(calls).toBe(1);await page.clock.fastForward(1000);await expect(page.getByRole('button',{name:'Check again',exact:true})).toBeEnabled();expect(calls).toBe(1);
 await page.getByRole('button',{name:'SCOUT IT',exact:true}).click();await expect(page.getByRole('heading',{name:'Source not connected',exact:true})).toBeVisible();expect(calls).toBe(2);expect(new URL(page.url()).searchParams.get('mint')).toBe(mint);await expect(page.locator('.mint-supply')).toHaveCount(0);await axe(page);
});

test('SYNTHETIC OFFLINE readable controls and layered evidence retain exact source receipt',async({page},info)=>{
 await page.clock.install({time:new Date('2026-10-18T12:00:00.000Z')});await page.goto('http://127.0.0.1:4181/?scenario=production-profile&mint='+mint);
 await expect(page.getByRole('heading',{name:'SCOUT Brief',exact:true})).toBeFocused();await expect(page.locator('.test-only-notice')).toBeVisible();await expect(page.locator('.mint-authorities')).toContainText('More tokens possible?');await expect(page.locator('.mint-authorities')).toContainText('Yes, a control is present');await expect(page.locator('.mint-authorities')).toContainText('Freeze authority absent');await expect(page.locator('.mint-observed')).toContainText('18 Oct 2026, 12:00:00 UTC');
 const summary=page.getByText('Evidence & exact address',{exact:true});await summary.focus();await page.keyboard.press('Enter');await expect(page.locator('.mint-details > dl').getByText(mint,{exact:true})).toBeVisible();await expect(page.getByText('mainnet.helius-rpc.com',{exact:true})).toBeVisible();await expect(page.locator('.mint-details > dl').getByText('2026-10-18T12:00:00.000Z',{exact:true})).toBeVisible();await expect(page.getByText('18446744073709551615',{exact:true})).toBeHidden();
 await expect(page.getByRole('link',{name:'Verify address in Solana Explorer ↗',exact:true})).toHaveAttribute('href','https://explorer.solana.com/address/'+mint+'?cluster=mainnet-beta');await axe(page);await page.screenshot({path:`experiments/consumer-mvp/web/node_modules/.cache/v17-regression-screenshots/after-chain-evidence-${info.project.name}.png`,fullPage:true});
 const technical=page.getByText('Technical receipt & controls',{exact:true});await technical.focus();await page.keyboard.press('Enter');await expect(page.getByText('18446744073709551615',{exact:true})).toBeVisible();await expect(page.getByText('a'.repeat(64),{exact:true})).toBeVisible();await expect(page.getByText('production_rpc',{exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(technical).toBeFocused();await expect(page.locator('.mint-details')).toHaveAttribute('open');await expect(page.locator('.mint-technical')).not.toHaveAttribute('open');await summary.focus();await page.keyboard.press('Escape');await expect(summary).toBeFocused();await expect(page.locator('.mint-details')).not.toHaveAttribute('open');
});

test('SYNTHETIC OFFLINE expiry hides facts and historical page can explicitly recover a new test capture',async({page})=>{
 await page.clock.install({time:new Date('2026-10-18T12:00:00.000Z')});await page.goto('http://127.0.0.1:4181/?scenario=recover&mint='+si);await expect(page.locator('.mint-supply')).toBeVisible();expect(await page.locator('html').getAttribute('data-reads')).toBe('1');
 await page.clock.fastForward(60_001);await expect(page.locator('.mint-historical-status')).toContainText('Observation expired');await expect(page.locator('.mint-supply,.mint-authorities')).toHaveCount(0);await expect(page.locator('.answer-card')).toContainText('14 Oct 2026');await expect(page.locator('.answer-card')).toContainText('Financial figures withheld');expect(await page.locator('html').getAttribute('data-reads')).toBe('1');
 const retryBefore=await page.evaluate(()=>Date.now());await page.getByRole('button',{name:'Check again',exact:true}).click();await expect(page.locator('.mint-supply')).toBeVisible();expect(await page.locator('html').getAttribute('data-reads')).toBe('2');const checked=Date.parse(await page.locator('.mint-observed time').getAttribute('datetime')),retryAfter=await page.evaluate(()=>Date.now());expect(checked).toBeGreaterThanOrEqual(retryBefore);expect(checked).toBeLessThanOrEqual(retryAfter);await page.getByText('Separate StonkFun evidence · 14 Oct 2026 · stale',{exact:true}).click();await expect(page.locator('.answer-card')).toContainText('14 Oct 2026');await expect(page.locator('.answer-card')).toContainText('Metadata publication and retention rights remain unverified.');await axe(page);
});
