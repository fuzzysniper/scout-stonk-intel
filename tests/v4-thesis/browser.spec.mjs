import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
const mint='So11111111111111111111111111111111111111112';
const note='SYNTHETIC ONLY: my original hypothesis, not a sourced fact.';
async function authenticate(context,request){const r=await request.get('/__synthetic/session'),s=await r.json();await context.addCookies([{name:'synthetic_thesis',value:s.cookie,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Strict'}]);return s;}
async function select(page){await page.getByLabel('Solana contract address').fill(mint);await page.getByRole('button',{name:'View facts'}).click();}
test.beforeEach(async({page})=>{
 await page.request.post('/__synthetic/reset');
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.addInitScript(()=>{window.__storageCalls=[];for(const k of ['getItem','setItem','removeItem','clear'])Storage.prototype[k]=function(){window.__storageCalls.push(k);throw Error('NO_BROWSER_STORAGE');};for(const k of ['open','deleteDatabase','databases'])indexedDB[k]=()=>{window.__storageCalls.push(k);throw Error('NO_INDEXEDDB');};});
});
test.afterEach(async({page})=>{expect(await page.evaluate(()=>window.__storageCalls)).toEqual([]);});
test('OFF has no Save/Load/history or API call, even with query activation flags',async({page})=>{
 const api=[];page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(r.url());});
 await page.goto('/lens?save=true&storage=true&owner=founder');await select(page);await page.getByLabel('What do you believe, and why?').fill(note);
 await expect(page.getByText('NOT SAVED',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/Save thesis|Load thesis|Add update|View history/})).toHaveCount(0);expect(api).toEqual([]);
});
test('real local encrypted Save → new session Load → immutable original + timestamped revision',async({page,context,request},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await authenticate(context,request);await page.goto('/lens');await select(page);
 await page.getByLabel('What do you believe, and why?').fill(note);await page.getByRole('button',{name:'Save thesis'}).click();await expect(page.locator('#journal-status')).toContainText('Thesis saved');
 await authenticate(context,request);await page.reload();await select(page);await page.getByRole('button',{name:'Load thesis'}).click();await expect(page.getByLabel('What do you believe, and why?')).toHaveValue(note);
 const updated='SYNTHETIC ONLY: revised hypothesis with new counter-evidence.';await page.getByLabel('What do you believe, and why?').fill(updated);await page.getByRole('button',{name:'Add update'}).click();await expect(page.locator('#journal-status')).toContainText('Update recorded');
 await page.getByRole('button',{name:'View history',exact:true}).click();await page.getByText('View original',{exact:true}).click();await page.getByText('View history · 2 revisions',{exact:true}).click();
 await expect(page.locator('details').filter({has:page.getByText('View original',{exact:true})})).toContainText(note);
 await expect(page.getByText('Original preserved.',{exact:false}).first()).toBeVisible();expect(await page.locator('article > p').filter({hasText:'UNAVAILABLE'}).count()).toBe(3);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
 await page.screenshot({path:`tests/v4-thesis/screenshots/local-save-history-${info.project.name}.png`,fullPage:true});
});
test('revoked session clears private history and never claims successful save',async({page,context,request})=>{
 await authenticate(context,request);await page.goto('/lens');await select(page);await page.getByLabel('What do you believe, and why?').fill(note);await page.getByRole('button',{name:'Save thesis'}).click();await expect(page.locator('#journal-status')).toContainText('Thesis saved');
 await page.request.get('/__synthetic/revoke');await page.getByLabel('What do you believe, and why?').fill('SYNTHETIC ONLY changed draft');await page.getByRole('button',{name:'Add update'}).click();await expect(page.locator('#journal-status')).toContainText('Session unavailable');await expect(page.getByLabel('What do you believe, and why?')).toHaveValue('');await expect(page.getByText('NOT SAVED',{exact:true})).toBeVisible();
});
test('uncertain commit has no automatic retry; deliberate Load recovers actual saved receipt',async({page,context,request})=>{
 await authenticate(context,request);await page.goto('/lens');await select(page);let posts=0;
 await page.route('**/api/v4/theses',async route=>{if(route.request().method()==='POST'){posts++;await route.fetch();await route.abort('failed');}else await route.continue();});
 await page.getByLabel('What do you believe, and why?').fill(note);await page.getByRole('button',{name:'Save thesis'}).click();await expect(page.locator('#journal-status')).toContainText('outcome unknown');await expect(page.getByRole('button',{name:'Save thesis'})).toBeDisabled();expect(posts).toBe(1);
 await page.getByRole('button',{name:'Load thesis'}).click();await expect(page.locator('#journal-status')).toContainText('history loaded');await expect(page.getByLabel('What do you believe, and why?')).toHaveValue(note);
});
test('keyboard focus, clear/bfcache and changing mint never attach private receipt to another mint',async({page,context,request})=>{
 await authenticate(context,request);await page.goto('/lens');await select(page);await page.getByLabel('What do you believe, and why?').fill(note);await page.getByRole('button',{name:'Save thesis'}).focus();await page.keyboard.press('Enter');await expect(page.locator('#journal-status')).toContainText('Thesis saved');await expect(page.locator('#journal-status')).toBeFocused();
 await page.getByLabel('Solana contract address').fill('11111111111111111111111111111111');await page.getByRole('button',{name:'View facts'}).click();await expect(page.getByText('NOT SAVED',{exact:true})).toBeVisible();await expect(page.getByLabel('What do you believe, and why?')).toHaveValue('');await expect(page.getByRole('button',{name:'View history'})).toHaveCount(0);
 await page.getByRole('button',{name:'Clear this session'}).click();await expect(page.getByLabel('Solana contract address')).toBeFocused();await expect(page.getByLabel('What do you believe, and why?')).toHaveValue('');await expect(page.getByRole('button',{name:'View history'})).toHaveCount(0);
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await expect(page.getByLabel('Solana contract address')).toHaveValue('');
});
test('edits made while a save is pending stay visibly unsaved after the prior draft commits',async({page,context,request})=>{
 await authenticate(context,request);await page.goto('/lens');await select(page);let release;const gate=new Promise(r=>release=r);
 await page.route('**/api/v4/theses',async route=>{await gate;await route.continue();});
 await page.getByLabel('What do you believe, and why?').fill(note);await page.getByRole('button',{name:'Save thesis'}).click();
 await page.getByLabel('What do you believe, and why?').fill('SYNTHETIC ONLY later unsaved edit');release();await expect(page.locator('#journal-status')).toContainText('Current edits are not saved');await expect(page.getByText('NOT SAVED',{exact:true})).toBeVisible();await expect(page.getByLabel('What do you believe, and why?')).toHaveValue('SYNTHETIC ONLY later unsaved edit');
});
test('real concurrent-session conflict keeps current draft and does not silently overwrite history',async({page,context,request})=>{
 const session=await authenticate(context,request);await page.goto('/lens');await select(page);await page.getByLabel('What do you believe, and why?').fill(note);await page.getByRole('button',{name:'Save thesis'}).click();await expect(page.locator('#journal-status')).toContainText('Thesis saved');
 const list=await (await page.request.get('/api/v4/theses?mint='+mint,{headers:{'X-UNFARMD-V4-OWNER-INTENT':'journal'}})).json(),id=list.items[0].journalId;
 const saved=await (await page.request.get('/api/v4/theses/'+id+'?mint='+mint,{headers:{'X-UNFARMD-V4-OWNER-INTENT':'journal'}})).json();
 const response=await page.request.patch('/api/v4/theses/'+id,{headers:{Origin:'http://127.0.0.1:4288','X-UNFARMD-V4-OWNER-INTENT':'journal','X-CSRF-Token':session.csrf},data:{mint,requestId:crypto.randomUUID(),expectedHead:saved.receipt.storageHead,action:'revise',thesis:'SYNTHETIC ONLY other session change',invalidation:null}});expect(response.status()).toBe(200);
 await page.getByLabel('What do you believe, and why?').fill('SYNTHETIC ONLY conflicting local draft');await page.getByRole('button',{name:'Add update'}).click();await expect(page.locator('#journal-status')).toContainText('Changed elsewhere');await expect(page.getByLabel('What do you believe, and why?')).toHaveValue('SYNTHETIC ONLY conflicting local draft');
});
