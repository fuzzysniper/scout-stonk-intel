import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {AT,TOKEN,feed} from './fixtures.mjs';

const parentPath='/api/live-events/continuous/control';
const requests=new WeakMap();
const audit=async page=>expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
test.beforeEach(async({page})=>{
 const seen={api:[],external:[],errors:[]};requests.set(page,seen);
 page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))seen.api.push({path:u.pathname,method:r.method()});if(!['localhost','127.0.0.1'].includes(u.hostname))seen.external.push(u.host);});
 page.on('pageerror',e=>seen.errors.push(e.message));
 await page.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
});
test.afterEach(async({page})=>{expect(requests.get(page).external).toEqual([]);expect(requests.get(page).errors).toEqual([]);});

test('LOCAL TEST: operations guidance has no availability probes, navigation prefetch or mutation',async({page},info)=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
 const section=page.getByRole('region',{name:'Continuous-parent operations'}),link=page.getByRole('link',{name:'Open protected parent control',exact:true});
 await expect(section).toContainText('Parent control availability: not checked');await expect(section).toContainText('That response proves neither production SSO nor a completed parent STOP');
 await expect(page.locator('.live-status')).toContainText('bounded v1 only, not continuous-parent status');
 await expect(link).toHaveAttribute('href',parentPath);await expect(link).toHaveAttribute('referrerpolicy','no-referrer');
 await link.hover();await link.focus();await page.waitForLoadState('networkidle');expect(requests.get(page).api).toEqual([]);
 const target=await link.boundingBox();expect(target.height).toBeGreaterThanOrEqual(44);
 await page.keyboard.press('Tab');await expect(page.locator('.live-emergency>summary')).toBeFocused();await page.keyboard.press('Enter');
 await expect(section).toContainText('manually Suspend the dedicated UNFARMD Render background worker');await expect(section).toContainText('A Render status alone is not closure evidence');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await audit(page);
 await page.locator('#live-content').focus();await section.evaluate(e=>{const p=document.createElement('p');p.textContent='LOCAL TEST · SOURCE DISABLED · NO REAL IPHONE OR PARENT STOP';p.style.cssText='font-weight:bold;border:2px solid currentColor;padding:8px';e.prepend(p);});
 mkdirSync('docs/mobile-ops-177/screenshots',{recursive:true});await section.screenshot({path:`docs/mobile-ops-177/screenshots/parent-guidance-${info.project.name}.png`});
 expect(requests.get(page).api).toEqual([]);
});

test('LOCAL TEST: explicit same-origin parent navigation stays Control disabled and forwards no owner token',async({page},info)=>{
 await page.goto('/');await page.locator('#live-owner-token').fill(TOKEN);
 const responsePromise=page.waitForResponse(r=>new URL(r.url()).pathname===parentPath);
 await page.getByRole('link',{name:'Open protected parent control',exact:true}).click();const response=await responsePromise;
 expect(response.status()).toBe(503);expect(await response.text()).toBe('Control disabled');
 const req=response.request();expect(req.method()).toBe('GET');expect(req.headers().authorization).toBeUndefined();expect(req.headers().referer).toBeUndefined();expect(new URL(page.url()).search).toBe('');expect(page.url()).not.toContain(TOKEN);
 const csp=response.headers()['content-security-policy'];expect(csp).toContain("default-src 'none'");expect(csp).toMatch(/script-src 'sha256-[A-Za-z0-9+/=]+'/);expect(csp).toContain("connect-src 'self'");expect(csp).toContain("frame-ancestors 'none'");expect(response.headers()['cache-control']).toContain('private, no-store');expect(response.headers()['x-frame-options']).toBe('DENY');
 expect(requests.get(page).api).toEqual([{path:parentPath,method:'GET'}]);
 expect(await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}))).toEqual({local:{},session:{}});
 mkdirSync('docs/mobile-ops-177',{recursive:true});writeFileSync(`docs/mobile-ops-177/control-disabled-${info.project.name}.json`,JSON.stringify({scope:'LOCAL TEST; actual optimized loopback route with default flags OFF. Does not prove Vercel SSO, production host admission, owner auth, source availability or parent STOP.',status:response.status(),body:await response.text(),csp,requests:requests.get(page).api,ownerBearerForwarded:false,query:'',externalRequests:0},null,2)+'\n');
});

test('LOCAL MOCK: original v1 STOP retains its exact contract and never claims continuous-parent STOP',async({page},info)=>{
 await page.clock.install({time:new Date(AT)});
 await page.route('**/api/live-events',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(feed())}));
 let stopCalls=0;await page.route('**/api/live-events/stop',r=>{stopCalls++;expect(r.request().method()).toBe('POST');expect(r.request().headers().authorization).toBe('Bearer '+TOKEN);expect(r.request().headers()['x-scout-live-intent']).toBe('STOP_SCOUT_LIVE');expect(r.request().postData()).toBeNull();return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({version:'scout-live/1',status:'stopped',observedAt:AT})});});
 await page.goto('/');await page.locator('#live-owner-token').fill(TOKEN);await page.getByRole('button',{name:'Read observations',exact:true}).click();await expect(page.locator('.live-event')).toHaveCount(2);
 await page.getByText('Original bounded v1 · STOP only',{exact:true}).click();await expect(page.locator('.live-owner-stop')).toContainText('This does not STOP a continuous parent');
 await expect(page.getByRole('button',{name:'STOP source',exact:true})).toBeDisabled();await page.locator('#live-stop-token').fill(TOKEN);await page.getByRole('checkbox').check();expect(stopCalls).toBe(0);await page.getByRole('button',{name:'STOP source',exact:true}).click();
 await expect(page.locator('.live-stop-notice')).toContainText('Durable STOP confirmed');await expect(page.locator('.live-owner-stop')).toContainText('Bounded v1 STOP acknowledgment');
 await expect(page.locator('.live-parent-operations')).toContainText('Parent control availability: not checked');await expect(page.locator('#live-stop-token')).toHaveValue('');
 await page.clock.fastForward(30000);expect(stopCalls).toBe(1);expect(requests.get(page).api).toEqual([{path:'/api/live-events',method:'GET'},{path:'/api/live-events/stop',method:'POST'}]);
 await page.locator('.live-owner-stop').evaluate(e=>{const p=document.createElement('p');p.textContent='LOCAL TEST · MOCK V1 ACK ONLY · NO REAL SOURCE OR PARENT STOP';p.style.cssText='font-weight:bold;border:2px solid currentColor;padding:8px';e.querySelector('summary').insertAdjacentElement('afterend',p);});
 mkdirSync('docs/mobile-ops-177/screenshots',{recursive:true});await page.locator('.live-owner-stop').screenshot({path:`docs/mobile-ops-177/screenshots/v1-scope-mock-${info.project.name}.png`});
});

test('LOCAL TEST: keyboard, 200% zoom and landscape preserve the separate link and manual fallback',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');const link=page.getByRole('link',{name:'Open protected parent control',exact:true});
 await page.evaluate(()=>document.documentElement.style.zoom='2');await link.focus();await expect(link).toBeFocused();await expect(link).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.keyboard.press('Tab');await expect(page.locator('.live-emergency>summary')).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('.live-emergency')).toContainText('Do not resume, restart or reset STOP');await audit(page);
 await page.evaluate(()=>document.documentElement.style.zoom='');await page.setViewportSize({width:844,height:390});await page.reload();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(requests.get(page).api).toEqual([]);
});
