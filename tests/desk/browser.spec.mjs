import {test, expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
import {fields} from '../../app/desk/draft.mjs';
const audit = new WeakMap();
test.beforeEach(async ({page}) => {
 const seen = {api:[],external:[],errors:[]}; audit.set(page,seen);
 page.on('request', request => {const u=new URL(request.url());if(u.pathname.startsWith('/api/'))seen.api.push(u.pathname);if(!['127.0.0.1','localhost'].includes(u.hostname))seen.external.push(u.host);});
 page.on('pageerror', error => seen.errors.push(error.message));
 await page.route('**/*', route => ['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
 await page.addInitScript(() => {
  window.__storageWrites=[];
  for (const method of ['setItem','removeItem','clear']) Storage.prototype[method]=function(){window.__storageWrites.push(method);};
 });
 await page.goto('/desk');await page.waitForLoadState('networkidle');
});
test.afterEach(async({page}) => {
 expect(audit.get(page)).toEqual({api:[],external:[],errors:[]});
 expect(await page.evaluate(()=>window.__storageWrites)).toEqual([]);
 expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}))).toEqual({local:0,session:0});
 expect(await page.context().cookies()).toEqual([]);
});
const noOverflow=async page=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
const axe=async page=>expect((await new AxeBuilder({page}).include('#scout-content').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
async function screenshot(page, info, state) {
 await page.evaluate(() => {let label=document.querySelector('#local-test');if(!label){label=document.createElement('p');label.id='local-test';label.textContent='LOCAL TEST · MANUAL PROTOTYPE · NO LIVE DATA';label.style.cssText='padding:12px;background:#fff;color:#000;font:700 14px sans-serif';document.querySelector('main').prepend(label);}});
 await page.screenshot({path:`tests/desk/screenshots/${state}-${info.project.name}.png`,fullPage:true});
}
test('source-disabled baseline is honest, accessible and mobile-sized',async({page},info)=>{
 await expect(page).toHaveTitle('UNFARMD · Decision Desk prototype');
 await expect(page.getByRole('heading',{level:1})).toContainText('Trade the thesis.');
 await expect(page.getByText('Unknown · not verified',{exact:true})).toBeVisible();
 await expect(page.getByText('No source connected · unavailable',{exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Risk preview · unconnected'})).toBeVisible();
 await expect(page.getByRole('button',{name:'PLAN',exact:true})).toHaveAttribute('aria-disabled','true');
 for(const [key] of fields){const box=await page.locator(`#desk-${key}`).boundingBox();expect(box.width).toBeGreaterThan(200);expect(box.height).toBeGreaterThanOrEqual(44);}
 await noOverflow(page);await axe(page);await screenshot(page,info,'empty');
});
test('PLAN incomplete denied; even a complete manual draft cannot approve risk',async({page})=>{
 await page.getByRole('button',{name:'PLAN',exact:true}).dispatchEvent('click');
 const outcome=page.getByRole('region',{name:'Decision outcome'});
 await expect(outcome).toContainText('PLAN · not recorded');await expect(outcome).toContainText('Invalidation & exit rationale');await expect(outcome).toBeFocused();
 for(const [key] of fields) await page.locator(`#desk-${key}`).fill('MANUAL TEST ASSUMPTION — not a market fact');
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:'PLAN',exact:true}).dispatchEvent('click');
 await expect(outcome).toContainText('Reviewed evidence integration');await expect(outcome).toContainText('Reviewed risk evaluation');
 await expect(outcome.locator('li')).toHaveCount(2);await axe(page);await noOverflow(page);
});
test('PASS works with reason only; WATCH incomplete; edit and refresh clear decisions',async({page},info)=>{
 const outcome=page.getByRole('region',{name:'Decision outcome'});
 await page.getByRole('button',{name:'PASS',exact:true}).click();await expect(outcome).toContainText('Write a decision reason.');
 await page.locator('#desk-reason').fill('MANUAL TEST: passing because evidence is unavailable.');
 await page.getByRole('button',{name:'PASS',exact:true}).click();await expect(outcome).toContainText('PASS · manual draft decision');await expect(outcome).toContainText('Not entered');await expect(outcome).toBeFocused();
 await axe(page);await screenshot(page,info,'pass');
 await page.locator('#desk-asset').fill('<script>MANUAL UNKNOWN ASSET</script>');await expect(outcome).toContainText('No decision selected');
 await page.getByRole('button',{name:'WATCH',exact:true}).click();await expect(outcome).toContainText('WATCH · manual draft decision');await expect(outcome).toContainText('<script>MANUAL UNKNOWN ASSET</script>');await noOverflow(page);
 await page.reload();await expect(page.locator('#desk-reason')).toHaveValue('');await expect(page.locator('#desk-asset')).toHaveValue('');await expect(outcome).toContainText('No decision selected');
 await page.locator('#desk-reason').fill('MANUAL');await page.getByRole('button',{name:'Clear draft',exact:true}).click();await expect(page.locator('#desk-reason')).toHaveValue('');
});
test('keyboard, zoom, landscape and reduced motion remain readable',async({page})=>{
 await page.locator('#desk-asset').focus();await page.keyboard.type('MANUAL UNKNOWN');await page.keyboard.press('Tab');await expect(page.locator('#desk-purpose')).toBeFocused();
 await page.getByRole('button',{name:'PLAN',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('region',{name:'Decision outcome'})).toContainText('PLAN · not recorded');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('html').evaluate(el=>el.style.zoom='2');await noOverflow(page);await axe(page);
 await page.setViewportSize({width:740,height:390});await noOverflow(page);
});
