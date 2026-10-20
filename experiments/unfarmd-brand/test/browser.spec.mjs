import {test,expect} from '../../consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const mint='So11111111111111111111111111111111111111112'; // Public format example only; no source lookup.
const evidence=new URL('../../../docs/unfarmd-brand/',import.meta.url);
mkdirSync(new URL('screenshots/',evidence),{recursive:true});
const activities=new WeakMap();
const screenshot=async(page,name,info,fullPage=false)=>{await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:new URL(`screenshots/${name}-${info.project.name}.png`,evidence).pathname,fullPage});};
const audit=async page=>{const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(result.violations).toEqual([]);return result.passes.length;};
test.beforeEach(async({page})=>{
 const activity={external:[],api:[],errors:[]};activities.set(page,activity);
 page.on('pageerror',e=>activity.errors.push(e.message));
 page.on('request',r=>{const u=new URL(r.url());if(!['127.0.0.1','localhost'].includes(u.hostname))activity.external.push(r.url());if(u.pathname.startsWith('/api/'))activity.api.push(u.pathname);});
 await page.route('**/*',route=>{const u=new URL(route.request().url());return !['127.0.0.1','localhost'].includes(u.hostname)||u.pathname.startsWith('/api/')?route.abort():route.continue();});
});
test.afterEach(async({page})=>{
 expect(activities.get(page)).toEqual({external:[],api:[],errors:[]});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('before: actual current Next production home, idle only; no API requests',async({page},info)=>{
 await page.goto('http://127.0.0.1:4180/');await expect(page.locator('.wordmark')).toContainText('SCOUT');await expect(page.getByRole('button',{name:'Analyze token',exact:true})).toBeVisible();await screenshot(page,'before-current-home',info);
});
for(const direction of ['escape','squad','quiet']){
 test(`${direction}: real responsive composition, readable source boundary, keyboard and accessibility`,async({page},info)=>{
  const response=await page.goto('/?direction='+direction);expect(response.headers()['content-security-policy']).toContain("connect-src 'none'");expect(response.headers()['referrer-policy']).toBe('no-referrer');expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');
  await expect(page.getByRole('navigation',{name:'Compare directions'}).locator('[aria-current]')).toHaveText(direction==='escape'?'01 / The escape':direction==='squad'?'02 / The misfits':'03 / Black sheep');
  await expect(page.locator('h1')).toHaveCount(1);await expect(page.getByLabel('Solana token address')).toBeVisible();
  const button=await page.locator('.scout-button').boundingBox(),boundary=await page.locator('#source-limit').boundingBox();
  expect(button.y+button.height).toBeLessThanOrEqual(page.viewportSize().height);expect(boundary.y+boundary.height).toBeLessThanOrEqual(page.viewportSize().height);
  expect(await page.locator('#mint').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
  await page.getByRole('link',{name:'Skip to main content'}).focus();await expect(page.getByRole('link',{name:'Skip to main content'})).toBeVisible();await page.keyboard.press('Enter');await page.locator('#mint').focus();
  const passes=await audit(page);await page.locator('#mint').blur();await screenshot(page,`after-${direction}`,info);await screenshot(page,`after-${direction}-full`,info,true);
  await page.locator('.tool-cards details summary').focus();await page.keyboard.press('Enter');await expect(page.locator('.tool-cards details')).toHaveAttribute('open');await expect(page.locator('.tool-cards details')).toContainText('publication rights');await page.keyboard.press('Escape');await expect(page.locator('.tool-cards details')).not.toHaveAttribute('open');
  await page.getByRole('button',{name:'What counts as evidence?'}).click();await expect(page.locator('#evidence-guide')).toHaveAttribute('open');await expect(page.locator('#evidence-guide summary')).toBeFocused();await expect(page.locator('#evidence-guide')).toContainText('No token source is queried');await page.keyboard.press('Escape');await audit(page);
  writeFileSync(new URL(`qa-${direction}-${info.project.name}.json`,evidence),JSON.stringify({direction,viewport:page.viewportSize(),productionArtifacts:true,syntheticTokenFacts:false,tokenFactsShown:false,liveChecks:0,providerRequests:0,apiRequests:0,axeViolations:0,axePasses:passes,button,boundary},null,2)+'\n');
 });
 test(`${direction}: deliberate exact-mint form, no invented result, identity and share recovery`,async({page,context},info)=>{
  await context.grantPermissions(['clipboard-read','clipboard-write']);await page.goto('/?direction='+direction);
  await page.getByRole('button',{name:'SCOUT this token',exact:true}).click();await expect(page.locator('#input-error')).toHaveText('Paste a Solana token address first.');await expect(page.locator('#mint')).toBeFocused();
  for(const value of ['SOL',mint+' ','https://example.test/?mint='+mint,'recovery '.repeat(12),'<img src=x onerror=alert(1)>']){await page.locator('#mint').fill(value);await page.locator('#mint').press('Enter');await expect(page.locator('#mint')).toHaveAttribute('aria-invalid','true');await expect(page.locator('#result')).toBeHidden();expect(new URL(page.url()).searchParams.has('mint')).toBe(false);}
  await page.evaluate(value=>navigator.clipboard.writeText(value),mint);await page.getByRole('button',{name:'Paste token address'}).click();await expect(page.locator('#mint')).toHaveValue(mint);await expect(page.locator('#result')).toBeHidden();
  await page.locator('#mint').press('Enter');await expect(page.locator('#result-title')).toBeFocused();await expect(page.locator('#result-title')).toHaveText('Address format checked.Token facts not checked.');await expect(page.locator('#exact-mint')).toHaveText(mint);expect(new URL(page.url()).searchParams.get('mint')).toBe(mint);await expect(page.locator('.result-facts')).toHaveText(/Onchain factsNot requestedMarket observationsNot requestedToken-specific risksNot assessedSource time & slotUnavailable/);
  await audit(page);await screenshot(page,`after-${direction}-address-only`,info,true);
  await page.getByRole('button',{name:'Copy address',exact:true}).click();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(mint);
  await page.getByRole('button',{name:'Copy study link',exact:true}).click();const shared=await page.evaluate(()=>navigator.clipboard.readText());expect(new URL(shared).searchParams.get('mint')).toBe(mint);expect(new URL(shared).searchParams.get('direction')).toBe(direction);
  await page.locator('#receipts summary').focus();await page.keyboard.press('Enter');await expect(page.locator('#receipts')).toContainText('No token receipt exists');await expect(page.locator('#receipts')).toContainText('14 October 2026');await expect(page.locator('#receipts')).toContainText('Token-2022');await audit(page);await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Check another address'}).click();await expect(page.locator('#mint')).toBeFocused();await expect(page.locator('#result')).toBeHidden();await page.goBack();await expect(page.locator('#exact-mint')).toHaveText(mint);await page.goForward();await expect(page.locator('#result')).toBeHidden();
  await page.goto(shared);await expect(page.locator('#exact-mint')).toHaveText(mint);
 });
}
test('clipboard refusal, in-flight paste cancellation, denied copy, reduced motion and direction switching',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?direction=escape');
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:async()=>{throw Error('OFFLINE clipboard denied');},writeText:async()=>{throw Error('OFFLINE clipboard denied');}}}));
 await page.getByRole('button',{name:'Paste token address'}).click();await expect(page.locator('#paste-status')).toContainText('Touch and hold');await expect(page.locator('#mint')).toBeFocused();
 await page.evaluate(()=>{window.__resolveBrandPaste=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:()=>new Promise(resolve=>window.__resolveBrandPaste=resolve),writeText:async()=>{throw Error('OFFLINE clipboard denied');}}});});
 await page.getByRole('button',{name:'Paste token address'}).click();await page.locator('#mint').fill(mint);await page.evaluate(()=>window.__resolveBrandPaste('SOL'));await expect(page.locator('#mint')).toHaveValue(mint);await page.locator('#mint').press('Enter');
 await page.getByRole('button',{name:'Copy study link',exact:true}).click();await expect(page.locator('#manual-copy')).toBeFocused();expect(new URL(await page.locator('#manual-copy').inputValue()).searchParams.get('mint')).toBe(mint);await expect(page.locator('#copy-status')).toContainText('Clipboard access unavailable');await audit(page);
 await page.getByRole('link',{name:'02 / The misfits',exact:true}).click();await expect(page.locator('#exact-mint')).toHaveText(mint);await expect(page.locator('body')).toHaveAttribute('data-direction','squad');expect(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('OFFLINE clipboard denied');}}}));
  await page.getByRole('button',{name:'Copy address',exact:true}).click();await expect(page.locator('#copy-fallback')).toBeVisible();
  await page.getByRole('button',{name:'Check another address'}).click();await page.locator('#mint').fill(mint.toLowerCase());await page.locator('#mint').press('Enter');
  await expect(page.locator('#copy-fallback')).toBeHidden();await expect(page.locator('#copy-status')).toBeEmpty();await expect(page.locator('#exact-mint')).toHaveText(mint.toLowerCase());
  await page.getByRole('link',{name:'03 / Black sheep',exact:true}).click();await expect(page.locator('#exact-mint')).toHaveText(mint.toLowerCase());
});
test('duplicate parameters, HTML in query and invalid mint never create source facts or unsafe markup',async({page})=>{
 await page.goto('/?direction=invalid&mint='+mint+'&mint='+mint);await expect(page.locator('#input-error')).toBeVisible();await expect(page.locator('#result')).toBeHidden();await expect(page.locator('body')).toHaveAttribute('data-direction','escape');
 await page.goto('/?direction='+encodeURIComponent('<img src=x>')+'&mint='+encodeURIComponent('<script>alert(1)</script>'));await expect(page.locator('#mint')).toHaveValue('<script>alert(1)</script>');await expect(page.locator('#result')).toBeHidden();expect(await page.locator('script').count()).toBe(1);await page.getByRole('link',{name:'03 / Black sheep',exact:true}).click();expect(new URL(page.url()).searchParams.has('mint')).toBe(false);
});
