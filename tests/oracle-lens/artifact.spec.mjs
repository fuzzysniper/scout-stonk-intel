// Actual optimized Next artifact, default OFF. No fixture interception or provider requests.
import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
const MINT='So11111111111111111111111111111111111111112';
test('optimized /lens hydrates, accepts a CA and honestly handles the actual gated denial',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.addInitScript(()=>{window.__storage=[];for(const k of ['getItem','setItem','removeItem','clear'])Storage.prototype[k]=function(){window.__storage.push(k);throw Error('NO_STORAGE');};});
 await page.goto('/lens');await expect(page.getByText('PREVIEW OFF',{exact:true})).toBeVisible();await page.getByLabel('Solana token address · CA').fill(MINT);
 const denied=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v4/ca-intelligence');await page.getByRole('button',{name:'INSPECT',exact:true}).click();
 const r=await denied;expect(r.status()).toBe(503);expect(r.headers()['cache-control']).toContain('no-store');expect(r.headers()['set-cookie']).toBeUndefined();
 // The UI deliberately does not consume a denied response body. Independently
 // read the actual endpoint via APIRequestContext rather than waiting on an
 // unconsumed Chromium fetch stream in DevTools.
 const off=await page.request.post('/api/v4/ca-intelligence',{data:{action:'inspect',mint:MINT}});expect(off.status()).toBe(503);expect(await off.json()).toEqual({error:'private_development_off'});
 await expect(page.getByRole('heading',{name:'UNFARMD INTELLIGENCE',exact:true})).toBeFocused();await expect(page.getByText('Token and exit controls unknown',{exact:true})).toBeVisible();await expect(page.locator('details[data-tone="green"]')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__storage)).toEqual([]);
});
