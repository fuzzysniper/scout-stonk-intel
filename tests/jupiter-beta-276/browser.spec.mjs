// Actual optimized LOCAL Next source-OFF responses; no response mocks or provider calls.
// Only admission metadata is SYNTHETIC, signed by an ephemeral Node TEST key.
import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
import {fixture,record,MINT} from './fixtures.mjs';
const notice=p=>p.locator('[data-jupiter-admission]');
test.beforeEach(async({page})=>{
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.addInitScript(()=>{window.__storage=[];for(const k of ['getItem','setItem','removeItem','clear'])Storage.prototype[k]=function(){window.__storage.push(k);throw Error('NO_STORAGE');};indexedDB.open=()=>{window.__storage.push('IDB');throw Error('NO_IDB');};});
});
test.afterEach(async({page})=>expect(await page.evaluate(()=>window.__storage)).toEqual([]));
function network(page){const calls=[];page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))calls.push({path:new URL(r.url()).pathname,headers:r.headers(),body:r.postData()});});return calls;}
async function inspect(page){await page.getByLabel('Solana token address · CA').fill(MINT);const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v4/ca-intelligence');await page.getByRole('button',{name:'INSPECT',exact:true}).click();expect((await response).status()).toBe(503);await expect(page.locator('[data-take-part="take"]>summary>strong')).toHaveText('No defensible thesis established.');await expect(page.getByRole('heading',{name:'UNFARMD ORACLE',exact:true})).toBeFocused();}
async function accessible(page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);}
test('LOCAL/SYNTHETIC public carrier is memory-only, stripped from URL, never authenticates, and adds no API requests',async({page},info)=>{
 const f=fixture(),encoded=f.encode(),calls=network(page),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/lens#jupiter-admission='+encoded);
 await expect(notice(page)).toContainText('Sources remain OFF');expect(new URL(page.url()).hash).toBe('');expect(calls).toEqual([]);
 await inspect(page);expect(calls).toHaveLength(1);expect(calls[0].path).toBe('/api/v4/ca-intelligence');expect(calls[0].headers['x-unfarmd-jupiter-admission']).toBe(encoded);expect(JSON.parse(calls[0].body)).toEqual({action:'inspect',mint:MINT});
 await expect(page.locator('details[data-tone="green"]')).toHaveCount(0);await page.getByText('All questions & evidence',{exact:false}).first().click();await expect(page.locator('[data-finding-id]')).toHaveCount(3);await expect(page.locator('[data-finding-id][data-tone="gray"]')).toHaveCount(3);await accessible(page);
 await page.evaluate(()=>{const b=document.createElement('p');b.textContent='LOCAL / SYNTHETIC ADMISSION · NO LIVE SOURCE OR OWNER AUTH';b.style.cssText='background:white;color:black;margin:0;padding:8px;font-size:12px';document.body.prepend(b);scrollTo(0,0);});await page.screenshot({path:`docs/jupiter-beta-276/off-${info.project.name}.png`});
 await page.getByRole('button',{name:'Clear this session',exact:true}).click();await expect(notice(page)).toHaveCount(0);await expect(page.getByLabel('Solana token address · CA')).toBeFocused();await inspect(page);expect(calls).toHaveLength(2);expect(calls[1].headers['x-unfarmd-jupiter-admission']).toBeUndefined();expect(errors).toEqual([]);
});
test('LOCAL/SYNTHETIC malformed, duplicate and private-field carriers fail closed without owner/native/status IO',async({page})=>{
 const f=fixture(),r=record(f.now);r.privateKey='SYNTHETIC_NOT_A_KEY';const calls=network(page);
 for(const hash of ['jupiter-admission=PRIVATE_KEY','jupiter-admission='+f.encode()+'&jupiter-admission='+f.encode(),'jupiter-admission='+f.encode(r),'jupiter-admission='+f.encode()+'&native-approval=SYNTHETIC']){await page.goto('/lens#'+hash);await expect(notice(page)).toContainText('unavailable');expect(new URL(page.url()).hash).toBe('');expect(calls).toEqual([]);}
 await inspect(page);expect(calls).toHaveLength(1);expect(calls[0].headers['x-unfarmd-jupiter-admission']).toBeUndefined();await page.locator('html').evaluate(e=>e.style.zoom='2');await accessible(page);
});
test('LOCAL/SYNTHETIC absolute carrier expiry/background withdrawal clears session data with no fetch or focus movement',async({page})=>{
 const f=fixture(),calls=network(page);await page.clock.install({time:new Date(f.now)});await page.goto('/lens#jupiter-admission='+f.encode());await expect(notice(page)).toContainText('received');await inspect(page);await page.getByLabel('Solana token address · CA').focus();await page.clock.fastForward(60001);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect(notice(page)).toHaveCount(0);await expect(page.locator('[data-oracle-take]')).toHaveCount(0);await expect(page.getByLabel('Solana token address · CA')).toBeFocused();expect(calls).toHaveLength(1);await accessible(page);
});
test('LOCAL/SYNTHETIC pagehide drops public carrier; keyboard evidence remains usable without renewal',async({page})=>{
 const f=fixture(),calls=network(page);await page.goto('/lens#jupiter-admission='+f.encode());await expect(notice(page)).toContainText('received');await inspect(page);const evidence=page.locator('[data-take-part="unknown"]>summary');await evidence.focus();await page.keyboard.press('Enter');await expect(page.locator('[data-take-part="unknown"]').getByText('Response SHA-256',{exact:true})).toBeVisible();expect(calls).toHaveLength(1);
 await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});await expect(notice(page)).toHaveCount(0);await expect(page.locator('[data-oracle-take]')).toHaveCount(0);expect(calls).toHaveLength(1);await accessible(page);
});
