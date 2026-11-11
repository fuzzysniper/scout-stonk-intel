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
const overflow=async page=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
const axe=async page=>expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
async function shot(page,info,state){await page.locator('main').evaluate(el=>{let p=document.getElementById('local-test-label');if(!p){p=document.createElement('p');p.id='local-test-label';p.textContent='LOCAL TEST · INVENTED ASSUMPTIONS · NO LIVE DATA';p.style.cssText='font:700 11px sans-serif;color:#000;background:#fff;padding:8px;margin:0 0 8px';el.prepend(p);}});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`tests/desk-journey/screenshots/${state}-${info.project.name}.png`,fullPage:true});}
async function thesis(page){await page.getByRole('button',{name:'Plan Work out your risk',exact:true}).click();for(const [key,value] of Object.entries({thesis:'LOCAL TEST: a hypothetical thesis',counterThesis:'The hypothesis can fail',unknowns:'No observed liquidity or reliable exits',horizon:'One hypothetical week'}))await input(page,key).fill(value);await input(page,'purpose').selectOption('swing');await page.getByRole('button',{name:'Next: risk',exact:true}).click();}
async function risk(page){
 await input(page,'instrument').selectOption('long_spot');await input(page,'currency').selectOption('USD');await input(page,'entry').fill('100');await input(page,'stop').fill('90');await page.getByRole('button',{name:'Next risk check',exact:true}).click();
 await input(page,'asOfUtc').fill('2026-10-27T21:30');await input(page,'validSeconds').fill('3600');await input(page,'invalidation').fill('Owner would reassess; no stop order');await page.getByRole('button',{name:'Next risk check',exact:true}).click();
 for(const [key,value] of Object.entries({capital:'10000',cash:'10000',existing:'0',loss:'100',allocationBps:'10'}))await input(page,key).fill(value);
 await page.getByText('Choose a quantity · optional',{exact:true}).click();await input(page,'units').fill('5');await expect(page.locator('header').getByRole('button',{name:'PASS',exact:true})).toBeInViewport();await page.getByRole('button',{name:'Next risk check',exact:true}).click();
 await input(page,'costMode').selectOption('explicit');for(const key of ['entryFee','exitFee','entrySlip','exitSlip','fixed'])await input(page,key).fill('0');await page.getByRole('button',{name:'Next: decide',exact:true}).click();
 await input(page,'reason').fill('LOCAL TEST: explicit hypothetical plan, not a recommendation');await input(page,'costConfirmed').check();await input(page,'confirmed').check();
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
test('PLAN incomplete fails with specific navigable blockers, PASS remains available',async({page})=>{
 await page.getByRole('navigation',{name:'Decision progress'}).getByRole('button',{name:/DECIDE/}).click();await page.getByRole('button',{name:'PLAN',exact:true}).click();await page.getByRole('button',{name:'Record MANUAL PLAN',exact:true}).click();await expect(outcome(page)).toContainText('Not recorded yet');await expect(outcome(page)).toBeFocused();
 await outcome(page).getByRole('button',{name:'Write why this might work.',exact:true}).first().click();await expect(input(page,'thesis')).toBeFocused();
 await page.getByRole('button',{name:'PASS',exact:true}).first().click();await input(page,'reason').fill('Insufficient evidence');await page.getByRole('button',{name:'Record PASS',exact:true}).click();await expect(outcome(page)).toContainText('PASS · recorded');
});
for(const failure of ['stop','time','budget','percent'])test(`actual risk denial: ${failure}, no successful receipt`,async({page})=>{
 await input(page,'asset').fill('TEST');await thesis(page);await risk(page);
 const destination=failure==='time'?1:failure==='stop'?0:2;
 await page.getByRole('navigation',{name:'Decision progress'}).getByRole('button',{name:/RISK/}).click();await page.getByRole('navigation',{name:'Risk checks'}).getByRole('button').nth(destination).click();
 const field=failure==='stop'?'stop':failure==='time'?'asOfUtc':failure==='budget'?'units':'allocationBps';
 if(field==='units')await page.getByText('Choose a quantity · optional',{exact:true}).click();
 await input(page,field).fill(failure==='stop'?'100':failure==='time'?'2026-10-28T21:30':failure==='budget'?'11':'1.001');
 await page.getByRole('navigation',{name:'Decision progress'}).getByRole('button',{name:/DECIDE/}).click();await input(page,'confirmed').check();await page.getByRole('button',{name:'Record MANUAL PLAN',exact:true}).click();await expect(outcome(page)).toContainText('Not recorded yet');await expect(page.getByRole('heading',{name:/MANUAL PLAN · recorded/})).toHaveCount(0);await overflow(page);
 const expected={stop:'Your exit price must be positive and below your entry price.',time:'Your assumption time is in the future. Review the UTC time.',budget:'Your proposed amount exceeds your planned-loss budget.',percent:'Use a percentage from 0 to 100, with at most 2 decimal places. No rounding is applied.'};await expect(outcome(page)).toContainText(expected[failure]);
 await outcome(page).getByRole('button',{name:expected[failure],exact:true}).click();await expect(input(page,field)).toBeFocused();
});
test('keyboard, full-page axe, 200% zoom, landscape and clearing are usable',async({page})=>{
 await input(page,'asset').focus();await page.keyboard.type('TEST');await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Research Think through both sides',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{level:1})).toBeFocused();
 await page.getByRole('navigation',{name:'Decision progress'}).getByRole('button',{name:/DECIDE/}).click();await expect(page.getByRole('button',{name:'PLAN',exact:true})).toHaveAttribute('aria-pressed','false');await expect(page.getByRole('button',{name:'Choose PLAN, WATCH or PASS',exact:true})).toBeDisabled();
 await page.locator('html').evaluate(el=>el.style.zoom='2');await page.emulateMedia({reducedMotion:'reduce'});await overflow(page);await axe(page);await page.setViewportSize({width:740,height:390});await overflow(page);
 await page.getByRole('button',{name:'Clear this session',exact:true}).click();await expect(input(page,'asset')).toHaveValue('');
});
