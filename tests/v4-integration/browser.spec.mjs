import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
const mint='So11111111111111111111111111111111111111112',audit=new WeakMap();
test.beforeEach(async({page})=>{
 const a={external:[],api:[],errors:[]};audit.set(page,a);
 page.on('request',r=>{const u=new URL(r.url());if(u.hostname!=='127.0.0.1')a.external.push(u.origin);if(u.pathname.startsWith('/api/'))a.api.push(u.pathname);});
 page.on('pageerror',e=>a.errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.addInitScript(()=>{
  window.__v4Storage=[];
  for(const name of ['getItem','setItem','removeItem','clear'])Storage.prototype[name]=function(){window.__v4Storage.push(name);throw Error('NO_STORAGE');};
  for(const name of ['open','deleteDatabase','databases'])indexedDB[name]=()=>{window.__v4Storage.push(name);throw Error('NO_INDEXEDDB');};
 });
 await page.goto('/lens');
});
test.afterEach(async({page})=>{
 expect(audit.get(page)).toEqual({external:[],api:[],errors:[]});expect(await page.evaluate(()=>window.__v4Storage)).toEqual([]);expect(await page.context().cookies()).toEqual([]);
});
test('literal first-time task: one CA, inspect grey evidence, owner note, no save/history claim',async({page},info)=>{
 await page.getByLabel('Solana contract address').fill(mint);await page.getByRole('button',{name:'View facts'}).click();
 await expect(page.getByRole('status')).toBeFocused();await expect(page.getByRole('status')).toContainText(mint);
 await expect(page.getByRole('status')).toContainText('identity unverified');
 await expect(page.locator('article')).toHaveCount(3);await expect(page.locator('article > p').filter({hasText:/UNAVAILABLE/})).toHaveCount(3);
 await page.locator('article summary').first().click();await expect(page.locator('article').first()).toContainText('Observed: Unavailable');
 await page.getByLabel('What do you believe, and why?').fill('TEST ONLY: this is my hypothesis, not a sourced fact.');
 await expect(page.getByText('NOT SAVED',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/save|record|export/i})).toHaveCount(0);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
 await page.evaluate(()=>{scrollTo(0,0);const label=document.createElement('p');label.textContent='LOCAL TEST · INTEGRATED A+B+C · INVENTED THESIS · SOURCES OFF';label.style.cssText='position:fixed;bottom:0;left:0;right:0;background:white;color:black;font:10px sans-serif;padding:4px';document.body.append(label);});
 await page.screenshot({path:`tests/v4-integration/screenshots/after-${info.project.name}.png`,fullPage:true});
});
test('malformed/exact whitespace CA and sample/query flags cannot enable an observation',async({page})=>{
 await page.getByLabel('Solana contract address').fill(' '+mint);await page.getByRole('button',{name:'View facts'}).click();
 await expect(page.locator('#ca-error')).toContainText('No lookup was attempted');await expect(page.getByLabel('Solana contract address')).toBeFocused();
 await page.goto('/lens?sample=1&sourceGo=true&PRODUCTION_RPC_ENABLED=true&mint='+mint);
 await expect(page.getByText('SOURCES OFF',{exact:true})).toBeVisible();await expect(page.locator('article > p').filter({hasText:/UNAVAILABLE/})).toHaveCount(3);
 for(const card of await page.locator('article').all())await expect(card).not.toContainText(/CHECK PASSED|MATERIAL RISK|CAUTION|\$[0-9]/);
});
test('owner prose remains unsaved text, and restored-page event clears the entire session',async({page})=>{
 await page.getByLabel('Solana contract address').fill(mint);await page.getByRole('button',{name:'View facts'}).click();
 const note='TEST ONLY <img src=x onerror="window.__executed=true">';await page.getByLabel('What do you believe, and why?').fill(note);
 await expect(page.getByLabel('What do you believe, and why?')).toHaveValue(note);expect(await page.evaluate(()=>window.__executed)).toBeUndefined();
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
 await expect(page.getByLabel('What do you believe, and why?')).toHaveValue('');await expect(page.getByLabel('Solana contract address')).toHaveValue('');
 await expect(page.getByRole('status')).toContainText('No observations yet');
});
