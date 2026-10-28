import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
const AT='2026-10-27T21:31:00.000Z',seen=new WeakMap();
test.beforeEach(async({page})=>{
 const audit={api:[],external:[],errors:[]};seen.set(page,audit);
 page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))audit.api.push(u.pathname);if(!['127.0.0.1','localhost'].includes(u.hostname))audit.external.push(u.hostname);});page.on('pageerror',e=>audit.errors.push(e.message));
 await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 await page.addInitScript(()=>{window.__unsafe=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__unsafe.push('storage:'+m);};indexedDB.open=()=>{window.__unsafe.push('indexedDB');throw Error('FORBIDDEN_STORAGE');};});
 await page.clock.install({time:new Date(AT)});await page.goto('/desk');await page.waitForLoadState('networkidle');
});
test.afterEach(async({page})=>{expect(seen.get(page)).toEqual({api:[],external:[],errors:[]});expect(await page.evaluate(()=>window.__unsafe)).toEqual([]);expect(await page.context().cookies()).toEqual([]);});
const input=(page,name)=>page.locator(`#journey-${name}`);
const outcome=page=>page.getByRole('region',{name:'Decision outcome'});
const feedback=page=>page.getByRole('region',{name:'Plan readiness'});
const progress=(page,stage)=>page.getByRole('navigation',{name:'Decision progress'}).getByRole('button',{name:new RegExp(stage)});
const nextMissing=page=>page.getByRole('button',{name:'Go to next missing step',exact:true});
const overflow=async page=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
const axe=async page=>expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
async function shot(page,info,state){if(!['incomplete','plan'].includes(state))return;await page.locator('main').evaluate(el=>{let p=document.getElementById('local-test-label');if(!p){p=document.createElement('p');p.id='local-test-label';p.textContent='LOCAL TEST · INVENTED ASSUMPTIONS · NO LIVE DATA';p.style.cssText='position:fixed;bottom:4px;left:12px;right:12px;z-index:10;font:700 11px sans-serif;color:#000;background:#fff;padding:6px;margin:0;';el.prepend(p);}});if(state==='incomplete')await feedback(page).evaluate(el=>el.scrollIntoView({block:'start'}));else await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`tests/desk-journey/screenshots/feedback-${state}-${info.project.name}.png`,fullPage:state!=='incomplete'});}
async function thesis(page){await page.getByRole('button',{name:'Plan Work out your risk',exact:true}).click();await fillThesis(page);}
async function fillThesis(page){for(const [key,value] of Object.entries({thesis:'LOCAL TEST: a hypothetical thesis',counterThesis:'The hypothesis can fail',unknowns:'No observed liquidity or reliable exits',horizon:'One hypothetical week'}))await input(page,key).fill(value);await input(page,'purpose').selectOption('swing');await page.getByRole('button',{name:'Next: risk',exact:true}).click();}
async function risk(page){
 await input(page,'instrument').selectOption('long_spot');await input(page,'currency').selectOption('USD');await input(page,'entry').fill('100');await input(page,'stop').fill('90');await page.getByRole('button',{name:'Next risk check',exact:true}).click();
 await input(page,'asOfUtc').fill('2026-10-27T21:30');await input(page,'validSeconds').fill('3600');await input(page,'invalidation').fill('Owner would reassess; no stop order');await page.getByRole('button',{name:'Next risk check',exact:true}).click();
 for(const [key,value] of Object.entries({capital:'10000',cash:'10000',existing:'0',loss:'100',allocationBps:'10'}))await input(page,key).fill(value);
 await page.getByText('Choose a quantity · optional',{exact:true}).click();await input(page,'units').fill('5');await expect(page.locator('header').getByRole('button',{name:'PASS',exact:true})).toBeInViewport();await page.getByRole('button',{name:'Next risk check',exact:true}).click();
 await input(page,'costMode').selectOption('explicit');for(const key of ['entryFee','exitFee','entrySlip','exitSlip','fixed'])await input(page,key).fill('0');await page.getByRole('button',{name:'Next: decide',exact:true}).click();
 await page.getByText('Your reason & acknowledgements',{exact:true}).click();await input(page,'reason').fill('LOCAL TEST: explicit hypothetical plan, not a recommendation');await input(page,'costConfirmed').check();await input(page,'confirmed').check();
}
test('front door offers the next action immediately, no legacy navigation or technical wall',async({page},info)=>{
 await expect(page.getByRole('heading',{level:1})).toHaveText('What are you considering?');await expect(page.getByRole('navigation',{name:'Primary'})).toHaveCount(0);
 await expect(input(page,'entry')).toHaveCount(0);await expect(input(page,'kind')).not.toBeVisible();await expect(page.getByText('Asset unresolved · not verified',{exact:true})).toBeVisible();
 for(const name of ['Research Think through both sides','Plan Work out your risk','Watch Wait for more information']){const box=await page.getByRole('button',{name,exact:true}).boundingBox();expect(box.height).toBeGreaterThanOrEqual(48);expect(box.y+box.height).toBeLessThanOrEqual(page.viewportSize().height);}
 await overflow(page);await axe(page);await shot(page,info,'consider');
});
test('immediate PASS requires only reason and at most two deliberate actions',async({page},info)=>{
 await input(page,'asset').fill('TEST');await page.getByRole('button',{name:'PASS',exact:true}).first().click();await input(page,'reason').fill('LOCAL TEST: evidence is insufficient.');await page.getByRole('button',{name:'Record PASS',exact:true}).click();
 await expect(outcome(page)).toContainText('PASS · recorded for this session');await expect(outcome(page)).toContainText('Not saved or executed');await expect(outcome(page)).toBeFocused();await axe(page);await overflow(page);await shot(page,info,'pass');
});
test('WATCH works with incomplete data, back/next preserve the current session and edits clear receipts',async({page})=>{
 await input(page,'asset').fill('TEST');await page.getByRole('button',{name:'Research Think through both sides',exact:true}).click();await input(page,'thesis').fill('MANUAL tentative idea');await page.getByRole('button',{name:'Back',exact:true}).click();await expect(input(page,'asset')).toHaveValue('TEST');
 await page.getByRole('button',{name:'Watch Wait for more information',exact:true}).click();await input(page,'reason').fill('Waiting for evidence');await page.getByRole('button',{name:'Record WATCH',exact:true}).click();await expect(outcome(page)).toContainText('WATCH · recorded');
 await page.getByRole('button',{name:'Review / edit',exact:true}).click();await input(page,'reason').fill('Changed reason');await expect(page.getByRole('heading',{name:/WATCH · recorded/})).toHaveCount(0);
 await page.getByRole('navigation',{name:'Decision progress'}).getByRole('button',{name:/THESIS/}).click();await expect(input(page,'thesis')).toHaveValue('MANUAL tentative idea');await page.reload();await expect(input(page,'asset')).toHaveValue('');
});
test('real A/B guided MANUAL PLAN, precise model, no automatic risk defaults',async({page},info)=>{
 await input(page,'asset').fill('TEST');await thesis(page);await expect(input(page,'instrument')).toHaveValue('');await expect(input(page,'currency')).toHaveValue('');await expect(input(page,'entry')).toHaveValue('');await shot(page,info,'risk');
 await risk(page);await page.getByRole('button',{name:'Record MANUAL PLAN',exact:true}).click();await expect(outcome(page)).toContainText('MANUAL PLAN · recorded for this session');
 await expect(outcome(page)).toContainText('Planned loss · USD');await expect(outcome(page).locator('dd').filter({hasText:/^50$/})).toHaveCount(1);await expect(outcome(page).locator('dd').filter({hasText:/^500$/})).toHaveCount(1);
 await expect(page.getByText('Asset unresolved · not verified',{exact:true})).toBeVisible();await expect(page.getByText('Market data not connected; manual planning available.',{exact:true})).toBeVisible();await overflow(page);await axe(page);await shot(page,info,'plan');
 await page.getByRole('button',{name:'PASS',exact:true}).first().click();await expect(page.getByRole('heading',{name:/MANUAL PLAN · recorded/})).toHaveCount(0);await expect(page.getByRole('button',{name:'Record PASS',exact:true})).toBeVisible();
});
test('incomplete PLAN has one visible next step, hidden details, no ready CTA or receipt; corrections keep data and focus',async({page},info)=>{
 await progress(page,'DECIDE').click();await page.getByRole('button',{name:'PLAN',exact:true}).click();await expect(feedback(page)).toContainText('Plan incomplete');await expect(page.getByRole('button',{name:'Record MANUAL PLAN',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Check my plan',exact:true}).click();await expect(feedback(page)).toContainText('Not recorded yet');await expect(feedback(page)).toBeFocused();await expect(page.getByRole('heading',{name:/MANUAL PLAN · recorded/})).toHaveCount(0);
 await expect(nextMissing(page)).toHaveCount(1);await expect(nextMissing(page)).toBeInViewport();const box=await feedback(page).boundingBox();expect(box.height).toBeLessThan(page.viewportSize().height-110);expect(box.y).toBeGreaterThanOrEqual(80);expect(box.y+box.height).toBeLessThanOrEqual(page.viewportSize().height);
 await expect(page.locator('#journey-all-issues')).not.toHaveAttribute('open','');await expect(page.locator('#journey-all-issues li').first()).not.toBeVisible();expect(await feedback(page).locator('button:visible').count()).toBe(2);await expect(feedback(page)).toContainText('Next: Add what you are considering.');await axe(page);await overflow(page);await shot(page,info,'incomplete');
 await page.getByText(/Show all issues/).click();await expect(page.locator('#journey-all-issues li').first()).toBeVisible();await page.getByText(/Show all issues/).click();await nextMissing(page).click();await expect(input(page,'asset')).toBeFocused();await input(page,'asset').fill('TEST');await page.getByRole('button',{name:'Back to decision',exact:true}).click();await expect(feedback(page)).toBeFocused();await expect(feedback(page)).toContainText('Next: Write why this might work.');await nextMissing(page).click();await expect(input(page,'thesis')).toBeFocused();await input(page,'thesis').fill('LOCAL TEST: tentative thesis');await page.getByRole('button',{name:'Back to decision',exact:true}).click();await expect(feedback(page)).toContainText('Next: Write what could go wrong.');await expect(feedback(page)).toBeFocused();
 await page.getByRole('button',{name:'PASS',exact:true}).first().click();await input(page,'reason').fill('Insufficient evidence');await page.getByRole('button',{name:'Record PASS',exact:true}).click();await expect(outcome(page)).toContainText('PASS · recorded');
});
for(const failure of ['stop','time','budget','percent'])test(`actual risk denial: ${failure}, no successful receipt`,async({page})=>{
 await input(page,'asset').fill('TEST');await thesis(page);await risk(page);
 const destination=failure==='time'?1:failure==='stop'?0:2;
 await page.getByRole('navigation',{name:'Decision progress'}).getByRole('button',{name:/RISK/}).click();await page.getByRole('navigation',{name:'Risk checks'}).getByRole('button').nth(destination).click();
 const field=failure==='stop'?'stop':failure==='time'?'asOfUtc':failure==='budget'?'units':'allocationBps';
 if(field==='units')await page.getByText('Choose a quantity · optional',{exact:true}).click();
 await input(page,field).fill(failure==='stop'?'100':failure==='time'?'2026-10-28T21:30':failure==='budget'?'11':'1.001');
 await page.getByRole('navigation',{name:'Decision progress'}).getByRole('button',{name:/DECIDE/}).click();await page.getByText('Your reason & acknowledgements',{exact:true}).click();await input(page,'confirmed').check();await expect(page.getByRole('button',{name:'Record MANUAL PLAN',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Check my plan',exact:true}).click();await expect(feedback(page)).toContainText('Not recorded yet');await expect(page.getByRole('heading',{name:/MANUAL PLAN · recorded/})).toHaveCount(0);await overflow(page);
 const expected={stop:'Your exit price must be positive and below your entry price.',time:'Your assumption time is in the future. Review the UTC time.',budget:'Your proposed amount exceeds your planned-loss budget.',percent:'Use a percentage from 0 to 100, with at most 2 decimal places. No rounding is applied.'};await expect(feedback(page)).toContainText(expected[failure]);
 await nextMissing(page).click();await expect(input(page,field)).toBeFocused();
});
test('keyboard, full-page axe, 200% zoom, landscape and clearing are usable',async({page})=>{
 await input(page,'asset').focus();await page.keyboard.type('TEST');await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Research Think through both sides',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{level:1})).toBeFocused();
 await page.getByRole('navigation',{name:'Decision progress'}).getByRole('button',{name:/DECIDE/}).click();await expect(page.getByRole('button',{name:'PLAN',exact:true})).toHaveAttribute('aria-pressed','false');await expect(page.getByRole('button',{name:'Choose PLAN, WATCH or PASS',exact:true})).toBeDisabled();
 await page.locator('html').evaluate(el=>el.style.zoom='2');await page.emulateMedia({reducedMotion:'reduce'});await overflow(page);await axe(page);await page.setViewportSize({width:740,height:390});await overflow(page);
 await page.getByRole('button',{name:'Clear this session',exact:true}).click();await expect(input(page,'asset')).toHaveValue('');
});

test('a denied check can be corrected through the guided steps and retried as a real valid manual PLAN',async({page})=>{
 await input(page,'asset').fill('TEST');await progress(page,'DECIDE').click();await page.getByRole('button',{name:'PLAN',exact:true}).click();await page.getByRole('button',{name:'Check my plan',exact:true}).click();await expect(feedback(page)).toContainText('Not recorded yet');await nextMissing(page).click();await expect(input(page,'thesis')).toBeFocused();await fillThesis(page);await risk(page);await expect(feedback(page)).toContainText('Plan ready to record');await page.getByRole('button',{name:'Record MANUAL PLAN',exact:true}).click();await expect(outcome(page)).toContainText('MANUAL PLAN · recorded for this session');await expect(outcome(page)).toBeFocused();
});
test('acknowledgement correction stays on the decision screen and no periodic check steals focus',async({page})=>{
 await input(page,'asset').fill('TEST');await thesis(page);await risk(page);await input(page,'confirmed').uncheck();await page.getByRole('button',{name:'Check my plan',exact:true}).click();await expect(feedback(page)).toContainText('Confirm your assumptions before recording a plan.');await nextMissing(page).click();await expect(input(page,'confirmed')).toBeFocused();await page.clock.fastForward(3000);await expect(input(page,'confirmed')).toBeFocused();await input(page,'confirmed').check();await expect(feedback(page)).toContainText('Plan ready to record');await expect(input(page,'confirmed')).toBeFocused();
});
test('ready status expires with actual B time checks, without recording or refreshing owner assumptions',async({page})=>{
 await input(page,'asset').fill('TEST');await thesis(page);await risk(page);await expect(feedback(page)).toContainText('Plan ready to record');await input(page,'confirmed').focus();await page.clock.fastForward(3600001);await expect(feedback(page)).toContainText('Plan incomplete');await expect(feedback(page)).toContainText('Your price assumption has expired.');await expect(page.getByRole('button',{name:'Record MANUAL PLAN',exact:true})).toHaveCount(0);await expect(input(page,'confirmed')).toBeFocused();await page.getByRole('button',{name:'Check my plan',exact:true}).click();await expect(page.getByRole('heading',{name:/MANUAL PLAN · recorded/})).toHaveCount(0);await nextMissing(page).click();await expect(input(page,'asOfUtc')).toBeFocused();await expect(input(page,'asOfUtc')).toHaveValue('2026-10-27T21:30');
});
test('incomplete PLAN does not inhibit WATCH; selected decision is never changed by a check',async({page})=>{
 await input(page,'asset').fill('TEST');await progress(page,'DECIDE').click();await page.getByRole('button',{name:'PLAN',exact:true}).click();await page.getByRole('button',{name:'Check my plan',exact:true}).click();await page.getByRole('button',{name:'WATCH',exact:true}).click();await input(page,'reason').fill('LOCAL TEST: wait for evidence');await page.getByRole('button',{name:'Record WATCH',exact:true}).click();await expect(outcome(page)).toContainText('WATCH · recorded');await expect(page.getByRole('heading',{name:/MANUAL PLAN · recorded/})).toHaveCount(0);
});

test('expiry transfers focus from a removed Record CTA to the actionable summary only',async({page})=>{
 await input(page,'asset').fill('TEST');await thesis(page);await risk(page);await page.getByRole('button',{name:'Record MANUAL PLAN',exact:true}).focus();await page.clock.fastForward(3600001);await expect(feedback(page)).toContainText('Plan incomplete');await expect(feedback(page)).toBeFocused();await expect(nextMissing(page)).toBeInViewport();await expect(page.getByRole('heading',{name:/MANUAL PLAN · recorded/})).toHaveCount(0);
});
