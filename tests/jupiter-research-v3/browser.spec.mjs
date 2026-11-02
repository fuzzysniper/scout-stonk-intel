// Actual optimized LOCAL Next page + OFF API. Only public metadata is SYNTHETIC.
// No real owner, Turnkey, reservation, provider, SQL or deployment evidence.
import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
import {fixture,MINTS} from './fixtures.mjs';
const notice=p=>p.locator('[data-jupiter-research]');
const count=p=>{const calls=[];p.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))calls.push({path:new URL(r.url()).pathname,headers:r.headers(),body:r.postData()});});return calls;};
async function inspect(p){await p.getByLabel('Solana token address · CA').fill(MINTS[0]);const response=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/v4/ca-intelligence');await p.getByRole('button',{name:'INSPECT',exact:true}).click();expect((await response).status()).toBe(503);await expect(p.locator('[data-take-part="take"]>summary>strong')).toHaveText('No defensible thesis established.');await expect(p.getByRole('heading',{name:'UNFARMD ORACLE',exact:true})).toBeFocused();}
async function qa(p){expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect((await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);}
test.beforeEach(async({page})=>{await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await page.addInitScript(()=>{window.__storage=[];for(const k of ['getItem','setItem','removeItem','clear'])Storage.prototype[k]=function(){window.__storage.push(k);throw Error('NO_STORAGE');};indexedDB.open=()=>{window.__storage.push('IDB');throw Error('NO_IDB');};});});
test.afterEach(async({page})=>expect(await page.evaluate(()=>window.__storage)).toEqual([]));
test('LOCAL/SYNTHETIC v3 enters existing lens, strips URL, stays UNVERIFIED/HARD-OFF, no auto IO, exact separate wire',async({page},info)=>{
 const f=fixture(),calls=count(page),logs=[];page.on('console',m=>logs.push(m.text()));page.on('pageerror',e=>logs.push(e.message));await page.goto('/lens#jupiter-research='+f.encoded);
 await expect(notice(page)).toContainText('UNVERIFIED');await expect(notice(page)).toContainText('Sources HARD-OFF');expect(new URL(page.url()).hash).toBe('');expect(calls).toEqual([]);
 await expect(page.getByRole('button',{name:'Owner sign in',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'STOP native source',exact:true})).toHaveCount(0);
 await inspect(page);expect(calls).toHaveLength(1);expect(calls[0].path).toBe('/api/v4/ca-intelligence');expect(calls[0].headers['x-unfarmd-jupiter-research']).toBe('3');expect(calls[0].headers['x-unfarmd-jupiter-admission']).toBeUndefined();expect(calls[0].headers['x-unfarmd-native-approval']).toBeUndefined();expect(JSON.parse(calls[0].body)).toEqual({action:'inspect',mint:MINTS[0],authorization:f.e});
 await expect(page.getByText('Powered by Jupiter',{exact:true})).toBeVisible();await expect(page.getByText('Jupiter Tokens V2 · provider-reported',{exact:false})).toBeVisible();await expect(page.locator('details[data-tone="green"]')).toHaveCount(0);
 await page.locator('[data-claim-check]>summary').focus();await page.keyboard.press('Enter');await page.getByLabel('Choose a claim').selectOption('organic');await expect(page.locator('[data-claim-check]').getByRole('status')).toHaveText('NOT ESTABLISHED');
 await page.getByText('All questions & evidence',{exact:false}).first().click();await expect(page.locator('[data-finding-id]')).toHaveCount(3);await expect(page.locator('[data-finding-id][data-tone="gray"]')).toHaveCount(3);await qa(page);
 expect(logs.join('\n')).not.toContain(f.encoded);expect(logs.join('\n')).not.toContain(f.e.ownerStamp.stampHeaderValue);
 await page.evaluate(()=>{const b=document.createElement('p');b.textContent='LOCAL / SYNTHETIC PUBLIC APPROVAL · SOURCE HARD-OFF';b.style.cssText='background:white;color:black;margin:0;padding:8px;font-size:12px';document.body.prepend(b);scrollTo(0,0);});await page.screenshot({path:`node_modules/.cache/jupiter-research-proof/off-${info.project.name}.png`});
 await page.getByRole('button',{name:'Clear this session',exact:true}).click();await expect(notice(page)).toHaveCount(0);await expect(page.getByLabel('Solana token address · CA')).toBeFocused();await inspect(page);expect(calls).toHaveLength(2);expect(JSON.parse(calls[1].body)).toEqual({action:'inspect',mint:MINTS[0]});
});
test('LOCAL/SYNTHETIC malformed, oversized, extra, duplicate and v1/v2/native conflicts discard with no owner or authority request',async({page})=>{
 const f=fixture(),calls=count(page),extra=Buffer.from(JSON.stringify({...f.e,privateKey:'LOCAL_NOT_A_KEY'})).toString('base64url');
 for(const hash of ['jupiter-research=BAD','jupiter-research='+'a'.repeat(87383),'jupiter-research='+extra,'jupiter-research='+f.encoded+'&jupiter-research='+f.encoded,'jupiter-research='+f.encoded+'&jupiter-admission=LOCAL_V1','jupiter-research='+f.encoded+'&native-approval=LOCAL_NATIVE']){await page.goto('/lens#'+hash);await expect(notice(page)).toContainText('HOLD');expect(new URL(page.url()).hash).toBe('');expect(calls).toEqual([]);}
 await inspect(page);expect(calls).toHaveLength(1);expect(JSON.parse(calls[0].body).authorization).toBeUndefined();await page.locator('html').evaluate(e=>e.style.zoom='2');await qa(page);
});
for(const exit of ['expiry','background','pagehide'])test('LOCAL/SYNTHETIC '+exit+' discards approval/private draft and current conclusions without network or focus change',async({page})=>{
 const f=fixture(),calls=count(page);await page.clock.install({time:new Date(f.now)});await page.goto('/lens#jupiter-research='+f.encoded);await expect(notice(page)).toContainText('UNVERIFIED');await inspect(page);await page.locator('#personal-thesis>summary').click();await page.getByLabel('What do you believe, and why?').fill('LOCAL PRIVATE SYNTHETIC NOTE');await page.getByLabel('Solana token address · CA').focus();
 if(exit==='expiry')await page.clock.fastForward(60001);
 else if(exit==='background')await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
 else await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
 await expect(notice(page)).toHaveCount(0);await expect(page.locator('[data-oracle-take]')).toHaveCount(0);await expect(page.getByLabel('Solana token address · CA')).toBeFocused();expect(calls).toHaveLength(1);await inspect(page);expect(JSON.parse(calls[1].body).authorization).toBeUndefined();await page.locator('#personal-thesis>summary').click();await expect(page.getByLabel('What do you believe, and why?')).toHaveValue('');await qa(page);
});
