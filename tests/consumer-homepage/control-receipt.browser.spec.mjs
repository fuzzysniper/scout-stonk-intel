import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {MINT,AT,mintFixture,failure} from './trader-fixtures.mjs';
import {labelOfflineReplay} from './unfarmd-capture.mjs';
const baseline=process.env.CONTROL_RECEIPT_BASELINE==='1';
const out='docs/unfarmd-consumer-v1/control-receipt/screenshots';
const calls=new WeakMap(),errors=new WeakMap(),external=new WeakMap();
const axe=async page=>expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
async function label(page){await labelOfflineReplay(page);await page.locator('#unfarmd-offline-test').evaluate(e=>{e.textContent='SYNTHETIC OFFLINE QA · INVENTED FACTS · NO RPC / NO REAL EXPORT';e.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#f5c8b4;color:#2c231e;padding:6px 8px;font:700 9px/1.4 Arial;text-align:center;pointer-events:none;';});}
async function screenshot(page,name,info,fullPage=false){mkdirSync(out,{recursive:true});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${out}/${name}-${info.project.name}.png`,fullPage});}
async function accepted(page,options={}){await page.clock.install({time:new Date(AT)});await page.route('**/api/mint-facts?*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mintFixture(MINT,options))}));await page.goto('/?mint='+MINT);expect(calls.get(page).length).toBe(0);await label(page);await page.locator('#mint').press('Enter');await expect(page.locator('.brief-status')).toHaveText('RPC snapshot accepted');}
test.beforeEach(async({page})=>{const log=[];calls.set(page,log);errors.set(page,[]);external.set(page,[]);page.on('pageerror',e=>errors.get(page).push(e.message));page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))log.push(r.url());if(!['localhost','127.0.0.1'].includes(u.hostname))external.get(page).push(u.href);});await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());await page.route('**/api/token?*',r=>r.abort());});
test.afterEach(async({page})=>{expect(errors.get(page)).toEqual([]);expect(external.get(page)).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);});
test('accepted result visual comparison: labeled offline production-shaped evidence',async({page},info)=>{
 await accepted(page,{freeze:true});await expect(page.locator('#brief-title')).toBeFocused();await axe(page);
 if(!baseline){await expect(page.locator('.control-receipt')).toBeVisible();await expect(page.locator('.receipt-supply')).toContainText('18,446,744,073.709551615');await expect(page.locator('.brief-controls')).toContainText('Can issue more');await expect(page.locator('.brief-controls')).toContainText('Can freeze accounts');}
 await screenshot(page,baseline?'before':'after',info);expect(calls.get(page)).toHaveLength(1);
 if(!baseline){const button=await page.locator('.copy-findings').boundingBox();expect(button.height).toBeGreaterThanOrEqual(44);expect(button.y+button.height).toBeLessThan(page.viewportSize().height-30);expect(await page.locator('.copy-findings').evaluate(e=>{const b=e.getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('button')===e;})).toBe(true);writeFileSync(`docs/unfarmd-consumer-v1/control-receipt/layout-${info.project.name}.json`,JSON.stringify({viewport:page.viewportSize(),copyButton:button,apiRequests:1,copyRequests:0,syntheticOffline:true,authenticObservation:false,axeViolations:0},null,2)+'\n');}
});

test('production-classification copy uses local labeled mock only, preserves exact evidence and makes no new request',async({page})=>{
 await accepted(page,{freeze:true});
 await page.evaluate(()=>{window.__offlineWrites=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__offlineWrites.push('SYNTHETIC OFFLINE TEST · NOT A LIVE EXPORT\n'+text);}}});});
 const button=page.getByRole('button',{name:'Copy SCOUT Findings',exact:true});await button.focus();await page.keyboard.press('Enter');await expect(page.locator('.receipt-copy-status')).toContainText('SCOUT findings copied');await expect(button).toBeFocused();
 const writes=await page.evaluate(()=>window.__offlineWrites);expect(writes).toHaveLength(1);
 for(const text of ['SYNTHETIC OFFLINE TEST','Exact mint: '+MINT,'Raw supply (base units): 18446744073709551615','Decimals: 9','PRESENT','Finalized context slot: 400000001',AT,'Server-reported RPC response SHA-256: '+'a'.repeat(64),'not independently replayed','Not a safety certification','durable receipt'])expect(writes[0]).toContain(text);
 expect(calls.get(page)).toHaveLength(1);await page.clock.fastForward(60001);await expect(page.locator('.brief-status')).toHaveText('Observation expired');await expect(page.getByRole('button',{name:'Copy SCOUT Findings',exact:true})).toHaveCount(0);expect(await page.evaluate(()=>window.__offlineWrites.length)).toBe(1);expect(calls.get(page)).toHaveLength(1);await axe(page);
});

test('clipboard rejection offers deliberate manual selection and removes it at original expiry',async({page})=>{
 await accepted(page);await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('OFFLINE clipboard permission denial');}}}));
 await page.getByRole('button',{name:'Copy SCOUT Findings',exact:true}).click();const field=page.getByLabel('Select SCOUT findings to copy');await expect(field).toBeFocused();await expect(field).toHaveAttribute('readonly');expect(await field.inputValue()).toContain(AT);expect(await field.evaluate(e=>e.selectionEnd-e.selectionStart)).toBe((await field.inputValue()).length);await axe(page);expect(calls.get(page)).toHaveLength(1);
 await page.clock.fastForward(60001);await expect(field).toHaveCount(0);await expect(page.locator('.receipt-export')).toHaveCount(0);expect(calls.get(page)).toHaveLength(1);
});

test('absent standard authorities remain qualified, never fixed-supply or safe-trading claims',async({page})=>{
 await accepted(page,{absent:true});await expect(page.locator('.brief-controls')).toContainText('Not present');await expect(page.locator('.brief-summary')).toContainText('Other risks remain');await expect(page.locator('.brief-boundary')).toContainText('sellability remain unknown');await expect(page.locator('.brief-controls [data-attention=true]')).toHaveCount(0);await expect(page.locator('.control-receipt')).not.toContainText('fixed supply');await axe(page);expect(calls.get(page)).toHaveLength(1);
});

test('Token-2022 control limits stay prominent with original clocks and reduced-motion behavior',async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'});await accepted(page,{absent:true,extensions:true});await expect(page.locator('.brief-controls')).toContainText('Token-2022');await expect(page.locator('.brief-controls')).toContainText('Additional controls are unknown');await expect(page.locator('.brief-controls [data-attention=true]')).toHaveCount(1);await expect(page.locator('.brief-clock time')).toHaveAttribute('datetime',AT);await expect(page.locator('.brief-clock')).toContainText('400000001');expect(await page.locator('.receipt-rule').evaluate(e=>getComputedStyle(e,'::after').animationName)).toBe('none');await axe(page);await screenshot(page,'after-token2022',info);
 await page.getByRole('button',{name:'Onchain evidence',exact:true}).click();await expect(page.locator('#research-onchain')).toBeFocused();await page.locator('.mint-details > summary').click();await expect(page.locator('.mint-details')).toContainText('mainnet.helius-rpc.com');await page.locator('.mint-technical > summary').click();await expect(page.locator('.mint-technical')).toContainText('a'.repeat(64));expect(calls.get(page)).toHaveLength(1);
});

test('trusted synthetic-offline display forbids copy; production rejects synthetic and invalid evidence',async({page})=>{
 await page.clock.install({time:new Date(AT)});await page.goto('http://127.0.0.1:4181/?scenario=extensions&mint='+MINT);await expect(page.locator('.control-receipt')).toContainText('SYNTHETIC');await expect(page.getByRole('button',{name:'Copy SCOUT Findings',exact:true})).toBeDisabled();await expect(page.locator('.receipt-export')).toContainText('No export from synthetic evidence');await axe(page);
 for(const raw of [{...mintFixture(),source:{...mintFixture().source,acquisition:'synthetic_fixture'}},{...mintFixture(),facts:{...mintFixture().facts,supply:{raw:'10',decimals:0,decimalAmount:'999'}}},failure()]){
  await page.route('**/api/mint-facts?*',r=>r.fulfill({status:raw.status==='unavailable'?503:200,contentType:'application/json',body:JSON.stringify(raw)}));await page.goto('http://127.0.0.1:4180/?mint='+MINT);await label(page);await page.locator('#mint').press('Enter');await expect(page.locator('.brief-status')).not.toHaveText('Checking source…');await expect(page.locator('.control-receipt,.receipt-export')).toHaveCount(0);await expect(page.locator('.mint-supply')).toHaveCount(0);
 }
});

test('a delayed clipboard rejection cannot reveal an expired manual export or steal evidence focus',async({page})=>{
 await accepted(page);await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise((_,reject)=>{window.__rejectOfflineCopy=()=>reject(Error('OFFLINE delayed denial'));})}});});
 await page.getByRole('button',{name:'Copy SCOUT Findings',exact:true}).click();await expect(page.locator('.copy-findings')).toBeDisabled();await page.getByRole('button',{name:'Onchain evidence',exact:true}).click();await expect(page.locator('#research-onchain')).toBeFocused();await page.clock.fastForward(60001);await page.evaluate(()=>window.__rejectOfflineCopy());await expect(page.locator('.receipt-manual')).toHaveCount(0);await expect(page.locator('#research-onchain')).toBeFocused();expect(calls.get(page)).toHaveLength(1);
});


test('missing clipboard API recovers through labeled manual text without any new acquisition',async({page})=>{
 await accepted(page);await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined}));await page.getByRole('button',{name:'Copy SCOUT Findings',exact:true}).click();await expect(page.getByLabel('Select SCOUT findings to copy')).toBeFocused();await expect(page.locator('.receipt-copy-status')).toContainText('Clipboard unavailable');expect(calls.get(page)).toHaveLength(1);await axe(page);
});

test('gesture eligibility denies a suspended-tab clock jump even before the expiry timer fires',async({page})=>{
 await accepted(page);await page.evaluate(()=>{window.__offlineWrites=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__offlineWrites.push('SYNTHETIC OFFLINE TEST\n'+text)}});});
 await page.clock.setSystemTime(new Date(Date.parse(AT)+60001));await page.getByRole('button',{name:'Copy SCOUT Findings',exact:true}).click();await expect(page.locator('.receipt-copy-status')).toContainText('Nothing copied');await expect(page.locator('.copy-findings')).toBeDisabled();expect(await page.evaluate(()=>window.__offlineWrites)).toEqual([]);expect(calls.get(page)).toHaveLength(1);
});
