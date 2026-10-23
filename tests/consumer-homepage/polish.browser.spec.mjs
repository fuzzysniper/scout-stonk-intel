import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {MINT,AT,mintFixture,failure} from './trader-fixtures.mjs';
import {labelOfflineReplay} from './unfarmd-capture.mjs';
const before=process.env.UNFARMD_POLISH_BEFORE==='1',phase=before?'before':'after';
const root='docs/unfarmd-consumer-v1/polish';
const activity=new WeakMap();
async function geometry(page){return page.evaluate(()=>{const a=document.activeElement,r=a?.getBoundingClientRect();return {focusId:a?.id??'',focusText:a?.textContent?.trim().slice(0,100),focusRect:r?{top:r.top,bottom:r.bottom}:null,viewport:{width:innerWidth,height:innerHeight},scrollY,overflow:document.documentElement.scrollWidth>innerWidth};});}
async function shot(page,name,info,fullPage=false,keepScroll=false){
 if(process.env.CONSUMER_CAPTURE==='0')return;
 if(!keepScroll)await page.evaluate(()=>scrollTo(0,0));
 // Scrolled fixture captures must retain a visible label. Clone the QA notice
 // as a fixed footer without changing the production layout or source fields.
 if(keepScroll)await page.evaluate(()=>{if(!scrollY||document.getElementById('polish-viewport-label'))return;const original=document.getElementById('unfarmd-offline-test');if(!original)return;const notice=original.cloneNode(true);notice.id='polish-viewport-label';Object.assign(notice.style,{position:'fixed',bottom:'0',left:'0',right:'0',zIndex:'9999',pointerEvents:'none'});document.body.append(notice);});
 await page.screenshot({path:`${root}/screenshots/${phase}-${name}-${info.project.name}.png`,fullPage});
}
async function axe(page){expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);}
async function visibleResultFocus(page){if(before)return;await expect(page.locator('#brief-title')).toBeFocused();const g=await geometry(page);expect(g.focusRect.top).toBeGreaterThanOrEqual(0);expect(g.focusRect.bottom).toBeLessThanOrEqual(g.viewport.height);}
test.beforeEach(async({page})=>{mkdirSync(`${root}/screenshots`,{recursive:true});const a={external:[],errors:[],calls:[]};activity.set(page,a);page.on('pageerror',e=>a.errors.push(e.message));page.on('request',r=>{const u=new URL(r.url());if(!['localhost','127.0.0.1'].includes(u.hostname))a.external.push(u.href);if(u.pathname.startsWith('/api/'))a.calls.push({method:r.method(),path:u.pathname});});await page.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());await page.route('**/api/token?*',r=>r.fulfill({status:503,contentType:'application/json',headers:{'retry-after':'60'},body:'{}'}));});
test.afterEach(async({page})=>{expect(activity.get(page).errors).toEqual([]);expect(activity.get(page).external).toEqual([]);expect(activity.get(page).calls.every(r=>r.method==='GET')).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);});

test('production keyboard audit: deliberate paste, pending result, accepted replay and user navigation',async({page,context},info)=>{
 await page.clock.install({time:new Date(AT)});await context.grantPermissions(['clipboard-read','clipboard-write']);
 let release;const hold=new Promise(r=>release=r);await page.route('**/api/mint-facts?*',async r=>{await hold;await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mintFixture(MINT,{freeze:true,extensions:true}))});});
 await page.goto('/');await axe(page);await shot(page,'landing',info);await page.evaluate(m=>navigator.clipboard.writeText(m),MINT);await page.getByRole('button',{name:'Paste token address',exact:true}).click();await expect(page.locator('#mint')).toHaveValue(MINT);expect(activity.get(page).calls).toEqual([]);
 await page.locator('#mint').focus();await page.keyboard.press('Enter');await expect(page.locator('.scout-brief')).toHaveAttribute('aria-busy','true');await expect(page.locator('.brief-skeleton')).toHaveCount(3);await visibleResultFocus(page);const loading=await geometry(page);await labelOfflineReplay(page);await shot(page,'loading',info);await axe(page);
 release();await expect(page.locator('.brief-status')).toHaveText('RPC snapshot accepted');await visibleResultFocus(page);const accepted=await geometry(page);await shot(page,'accepted',info);await axe(page);await shot(page,'accepted-full',info,true);
 if(!before){await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Review concerns',exact:true})).toBeFocused();}
 await page.getByRole('button',{name:'Onchain evidence',exact:true}).click();await expect(page.locator('#research-onchain')).toBeFocused();await page.locator('.mint-details > summary').focus();await page.keyboard.press('Enter');await expect(page.locator('.mint-details > dl')).toContainText(AT);await expect(page.locator('.mint-details > dl')).toContainText('400000001');await shot(page,'receipts',info,true);
 writeFileSync(`${root}/${phase}-keyboard-${info.project.name}.json`,JSON.stringify({base:'be75bb9166ae799c3fb13341332890afd7a8c247',phase,build:'actual Next.js production',synthetic:true,liveObservation:false,loading,accepted,activity:activity.get(page)},null,2)+'\n');
});

test('production disabled-source audit: honest unknowns and recovery',async({page},info)=>{
 await page.route('**/api/mint-facts?*',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify(failure())}));await page.goto('/');await page.locator('#mint').fill(MINT);await page.locator('#mint').press('Enter');await expect(page.locator('.brief-status')).toHaveText('Source not connected');await expect(page.locator('.mint-supply,.mint-authorities,[data-attention=true]')).toHaveCount(0);await visibleResultFocus(page);await labelOfflineReplay(page);await shot(page,'disabled',info);await axe(page);const disabled=await geometry(page);
 await page.getByRole('button',{name:'Explore dated examples',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.locator('#discovery-title')).toBeFocused();await page.getByRole('button',{name:/Explain Super Inu/}).click();await expect(page.locator('.answer-card')).toContainText('14 Oct 2026');await expect(page.locator('.answer-card')).toContainText('Financial figures withheld');await axe(page);
 writeFileSync(`${root}/${phase}-disabled-${info.project.name}.json`,JSON.stringify({phase,build:'actual Next.js production',synthetic:true,liveObservation:false,disabled,activity:activity.get(page)},null,2)+'\n');
});

test('a pending response must not interrupt evidence navigation or renew its timestamp',async({page},info)=>{
 await page.clock.install({time:new Date(AT)});let release;const hold=new Promise(r=>release=r);await page.route('**/api/mint-facts?*',async r=>{await hold;await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mintFixture())});});
 await page.goto('/');await page.locator('#mint').fill(MINT);await page.locator('#mint').press('Enter');await expect(page.locator('.scout-brief')).toHaveAttribute('aria-busy','true');await labelOfflineReplay(page);await page.getByRole('button',{name:'Onchain evidence',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.locator('#research-onchain')).toBeFocused();const reading=await geometry(page);
 release();await expect(page.locator('.brief-status')).toHaveText('RPC snapshot accepted');if(!before){await expect(page.locator('#research-onchain')).toBeFocused();expect(await page.evaluate(()=>scrollY)).toBeGreaterThan(0);}const resolved=await geometry(page);await shot(page,'navigation',info,false,true);await expect(page.locator('.mint-observed time')).toHaveAttribute('datetime',AT);await page.clock.fastForward(60_001);await expect(page.locator('.brief-status')).toHaveText('Observation expired');await expect(page.locator('.mint-supply,.trader-concern-list,[data-attention=true]')).toHaveCount(0);expect(activity.get(page).calls).toHaveLength(1);
 writeFileSync(`${root}/${phase}-navigation-${info.project.name}.json`,JSON.stringify({phase,build:'actual Next.js production',synthetic:true,liveObservation:false,reading,resolved,activity:activity.get(page)},null,2)+'\n');
});

test('touch-style scrolling survives completion; editing preserves the researched mint',async({page})=>{
 test.skip(before,'Candidate-only regression; the baseline focus defects are recorded by the three audits above.');
 await page.clock.install({time:new Date(AT)});let release;const hold=new Promise(r=>release=r);await page.route('**/api/mint-facts?*',async r=>{await hold;await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mintFixture())});});
 await page.goto('/');await page.locator('#mint').fill(MINT);await page.locator('#mint').press('Enter');await expect(page.locator('.scout-brief')).toHaveAttribute('aria-busy','true');await expect(page.locator('#brief-title')).toBeFocused();await labelOfflineReplay(page);
 // A finger scroll does not move DOM focus. Exercise that behavior in Chromium;
 // this does not claim a physical iPhone gesture or Safari acceptance.
 await page.locator('.trader-unknowns').scrollIntoViewIfNeeded();expect(await page.evaluate(()=>scrollY)).toBeGreaterThan(0);await expect(page.locator('#brief-title')).toBeFocused();release();await expect(page.locator('.brief-status')).toHaveText('RPC snapshot accepted');await expect(page.locator('#brief-title')).toBeFocused();expect(await page.evaluate(()=>scrollY)).toBeGreaterThan(0);expect(activity.get(page).calls).toHaveLength(1);
 await page.getByRole('button',{name:'Search another token',exact:true}).click();await expect(page.locator('#mint')).toBeFocused();await page.locator('#mint').fill('11111111111111111111111111111111');await expect(page.locator('.mint-identity code')).toHaveText(MINT);await page.locator('#mint').press('Escape');await expect(page.getByRole('button',{name:'Search another token',exact:true})).toBeFocused();await expect(page.locator('.mint-identity code')).toHaveText(MINT);expect(activity.get(page).calls).toHaveLength(1);await axe(page);
});
