import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
import {mkdirSync} from 'node:fs';
const AT='2026-10-27T21:31:00.000Z',seen=new WeakMap();
test.beforeEach(async({page})=>{
 const audit={api:[],external:[],errors:[]};seen.set(page,audit);
 page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))audit.api.push(u.pathname);if(!['127.0.0.1','localhost'].includes(u.hostname))audit.external.push(u.hostname);});page.on('pageerror',e=>audit.errors.push(e.message));
 await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 await page.addInitScript(()=>{
  window.__unsafe=[];
  for(const method of ['getItem','setItem','removeItem','clear'])Storage.prototype[method]=function(){window.__unsafe.push('storage:'+method);};
  indexedDB.open=()=>{window.__unsafe.push('indexedDB');throw Error('FORBIDDEN_STORAGE');};
 });
 await page.clock.install({time:new Date(AT)});await page.goto('/desk');await page.waitForLoadState('networkidle');
});
test.afterEach(async({page})=>{expect(seen.get(page)).toEqual({api:[],external:[],errors:[]});expect(await page.evaluate(()=>window.__unsafe)).toEqual([]);expect(await page.context().cookies()).toEqual([]);});
const overflow=async page=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
const axe=async page=>expect((await new AxeBuilder({page}).include('#scout-content').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
const outcome=page=>page.getByRole('region',{name:'Decision outcome'});
async function shot(page,info,state){
 const target=state==='plan'?page.getByTestId('desk-review'):page.locator('#scout-content');
 await target.evaluate(el=>{const p=document.createElement('p');p.textContent='LOCAL TEST · INVENTED MANUAL ASSUMPTIONS · NO VERIFIED ASSET / LIVE DATA';p.style.cssText='padding:12px;background:white;color:black;font:700 13px sans-serif';el.prepend(p);});
 mkdirSync('tests/desk-integration/screenshots',{recursive:true});const path=`tests/desk-integration/screenshots/${state}-${info.project.name}.png`;if(state==='plan')await target.screenshot({path});else await page.screenshot({path,fullPage:true});
}
async function complete(page){
 await page.locator('#desk-asset').fill('SYNTH');await page.locator('#desk-plan-fields>summary').click();
 await page.locator('#desk-purpose').selectOption('swing');
 const values={horizon:'A hypothetical week',thesis:'LOCAL TEST: owner-entered scenario only',counterThesis:'The hypothetical thesis can fail',unknowns:'No liquidity or fill evidence',reason:'LOCAL TEST: arithmetic exercise, not a recommendation',entry:'100',asOfUtc:'2026-10-27T21:30',validSeconds:'3600',stop:'90',invalidation:'Hypothetical owner invalidation, no stop order',capital:'10000',cash:'10000',existing:'0',loss:'100',allocationBps:'1000',units:'5'};
 for(const [key,value] of Object.entries(values))await page.locator('#desk-'+key).fill(value);
 await page.locator('#desk-instrument').selectOption('long_spot');await page.locator('#desk-currency').selectOption('USD');await page.locator('#desk-costMode').selectOption('explicit');
 for(const key of ['entryFee','exitFee','entrySlip','exitSlip','fixed'])await page.locator('#desk-'+key).fill('0');
 await affirm(page);
}
async function affirm(page){await page.locator('#desk-costConfirmed').check();await page.locator('#desk-confirmed').check();}
test('actual empty desk is source-disabled, blank assumptions unknown, no passive I/O',async({page},info)=>{
 await expect(page).toHaveTitle('UNFARMD · Manual Decision Desk');await expect(page.getByText('No connected verified sources',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Manual risk preview'})).toBeVisible();
 await expect(page.getByRole('button',{name:'MANUAL PLAN',exact:true})).toHaveAttribute('aria-disabled','true');
 await expect(page.locator('#desk-entry')).toHaveValue('');await expect(page.getByText('Worst-case loss is unknown.',{exact:false})).toBeVisible();await overflow(page);await axe(page);await shot(page,info,'empty');
});
test('manual PLAN actually records through A+B, independently of withheld sourced evidence',async({page},info)=>{
 await complete(page);await expect(page.getByRole('button',{name:'MANUAL PLAN',exact:true})).toHaveAttribute('aria-disabled','false');
 await expect(page.getByText('USD 50',{exact:true})).toBeVisible();await expect(page.getByText('USD 500',{exact:true})).toBeVisible();await expect(page.getByText('USD 1000',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'MANUAL PLAN',exact:true}).click();await expect(outcome(page)).toContainText('MANUAL PLAN · recorded in memory');await expect(outcome(page)).toContainText('Source-unverified · asset not verified');await expect(outcome(page)).toContainText('Not saved or executed');await expect(outcome(page)).toBeFocused();await axe(page);await overflow(page);await shot(page,info,'plan');
});
test('PASS reason-only, incomplete WATCH, edit and reload never imply approved risk or persistence',async({page},info)=>{
 await page.getByRole('button',{name:'PASS',exact:true}).click();await expect(outcome(page)).toContainText('Write a decision reason.');await expect(page.locator('#desk-reason')).toHaveAttribute('aria-invalid','true');
 await page.locator('#desk-reason').fill('LOCAL TEST: pass without market data');await page.getByRole('button',{name:'PASS',exact:true}).click();await expect(outcome(page)).toContainText('PASS · recorded in memory');await expect(outcome(page)).toContainText('Not entered');await expect(page.getByRole('button',{name:'MANUAL PLAN',exact:true})).toHaveAttribute('aria-disabled','true');await shot(page,info,'pass');
 await page.locator('#desk-asset').fill('UNKNOWN');await expect(outcome(page)).toContainText('previous decision has been cleared');await page.getByRole('button',{name:'WATCH',exact:true}).click();await expect(outcome(page)).toContainText('WATCH · recorded in memory');
 await page.locator('#desk-plan-fields>summary').click();await page.locator('#desk-cash').fill('0');await page.getByRole('button',{name:'WATCH',exact:true}).click();await expect(outcome(page)).toContainText('WATCH · recorded in memory');await expect(page.getByText('Manual PLAN not yet recordable',{exact:true})).toBeVisible();await axe(page);
 await page.reload();await expect(page.locator('#desk-reason')).toHaveValue('');await expect(page.locator('#desk-cash')).toHaveValue('');await expect(outcome(page)).toContainText('No decision selected');
});
test('actual stale/future assumptions block without changing owner clock or retrying',async({page})=>{
 await complete(page);await page.locator('#desk-asOfUtc').fill('2026-10-27T18:00');await affirm(page);await page.getByRole('button',{name:'MANUAL PLAN',exact:true}).dispatchEvent('click');await expect(outcome(page)).toContainText('reference has expired');await expect(page.locator('#desk-asOfUtc')).toHaveValue('2026-10-27T18:00');
 await page.locator('#desk-asOfUtc').fill('2026-10-27T23:00');await affirm(page);await page.getByRole('button',{name:'MANUAL PLAN',exact:true}).dispatchEvent('click');await expect(outcome(page)).toContainText('time is in the future');await expect(page.locator('#desk-asOfUtc')).toHaveAttribute('aria-invalid','true');await axe(page);
});
test('over-budget proposal denied, no resizing; editing clears confirmations and record',async({page})=>{
 await complete(page);await page.locator('#desk-units').fill('11');await affirm(page);await page.getByRole('button',{name:'MANUAL PLAN',exact:true}).dispatchEvent('click');await expect(outcome(page)).toContainText('exceed your planned-loss budget');await expect(page.locator('#desk-units')).toHaveValue('11');await expect(page.locator('#desk-units')).toHaveAttribute('aria-invalid','true');
 await page.locator('#desk-units').fill('5');await affirm(page);await page.getByRole('button',{name:'MANUAL PLAN',exact:true}).click();await expect(outcome(page)).toContainText('recorded in memory');await page.locator('#desk-entry').fill('101');await expect(outcome(page)).toContainText('previous decision has been cleared');await expect(page.locator('#desk-confirmed')).not.toBeChecked();await expect(page.locator('#desk-costConfirmed')).not.toBeChecked();await axe(page);
});
test('negative capacity, excess price precision and denomination tampering cannot become an approved budget',async({page})=>{
 await complete(page);await page.locator('#desk-cash').fill('-1');await affirm(page);await page.getByRole('button',{name:'MANUAL PLAN',exact:true}).dispatchEvent('click');await expect(outcome(page)).toContainText('not recorded');
 await page.locator('#desk-cash').fill('10000');await page.locator('#desk-entry').fill('100.0000000001');await affirm(page);await page.getByRole('button',{name:'MANUAL PLAN',exact:true}).dispatchEvent('click');await expect(outcome(page)).toContainText('not recorded');
 await page.locator('#desk-entry').fill('100');await page.locator('#desk-currency').evaluate(el=>el.add(new Option('LOCAL TEST unsupported USDC','USDC')));await page.locator('#desk-currency').selectOption('USDC');await affirm(page);await page.getByRole('button',{name:'MANUAL PLAN',exact:true}).dispatchEvent('click');await expect(outcome(page)).toContainText('unsupported instrument or currency');await expect(outcome(page)).not.toContainText('recorded in memory');await axe(page);
});
test('canonical identity is format only; no chain mapping or listing existence is invented',async({page})=>{
 await page.locator('#desk-kind').selectOption('solana_mint');await page.locator('#desk-chain').selectOption('solana:mainnet');await page.locator('#desk-asset').fill('11111111111111111111111111111111');await expect(page.getByText('Exact format · not verified',{exact:true})).toBeVisible();
 await page.getByText('Identity and source details',{exact:true}).click();await expect(page.locator('code')).toHaveText('solana:mainnet:11111111111111111111111111111111');await expect(page.getByText('Admitted source facts: 0.',{exact:false})).toBeVisible();
 await page.locator('#desk-kind').selectOption('listed_equity');await page.locator('#desk-asset').fill('aapl');await page.locator('#desk-mic').fill('XNAS');await expect(page.locator('code')).toHaveText('listed_equity:XNAS:AAPL');await expect(page.getByText('No connected verified sources',{exact:true})).toBeVisible();await overflow(page);await axe(page);
});
test('UTC assumptions remain UTC in Chicago; record revalidates after an unattended pause',async({page})=>{
 await complete(page);await expect(page.locator('#desk-asOfUtc')).toHaveValue('2026-10-27T21:30');await page.clock.fastForward(3600001);await page.getByRole('button',{name:'MANUAL PLAN',exact:true}).click();await expect(outcome(page)).toContainText('reference has expired');await expect(outcome(page)).not.toContainText('recorded in memory');await expect(page.locator('#desk-asOfUtc')).toHaveValue('2026-10-27T21:30');
});
test('keyboard, 200% text zoom, landscape and reduced motion preserve labels and focus',async({page})=>{
 await page.locator('#desk-asset').focus();await page.keyboard.type('SYNTH');await page.keyboard.press('Tab');await expect(page.getByText('Identity and source details',{exact:true})).toBeFocused();
 await page.getByRole('button',{name:'MANUAL PLAN',exact:true}).focus();await page.keyboard.press('Enter');await expect(outcome(page)).toContainText('not recorded');await expect(outcome(page)).toBeFocused();
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('html').evaluate(el=>el.style.zoom='2');await overflow(page);await axe(page);await page.locator('html').evaluate(el=>el.style.zoom='');await page.setViewportSize({width:740,height:390});await overflow(page);
});
