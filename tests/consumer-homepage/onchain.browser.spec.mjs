import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import {writeFileSync} from 'node:fs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
const mint='So11111111111111111111111111111111111111112'; // Input only; no chain lookup/fixture claim.
const si='DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP';
const axe=async page=>expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
const failures=new WeakMap(),requests=new WeakMap();
test.beforeEach(async({page})=>{
 const f=[],r=[];failures.set(page,f);requests.set(page,r);
 page.on('pageerror',e=>f.push(e.message));page.on('console',e=>{if(e.type()==='error')f.push(e.text());});page.on('response',r=>{if(r.status()>=400)f.push(r.status()+' '+r.url());});
 page.on('request',request=>{const url=new URL(request.url());if(!['127.0.0.1','localhost'].includes(url.hostname)||url.pathname.startsWith('/api/'))r.push(request.url());});
});
test.afterEach(async({page})=>{expect(failures.get(page)).toEqual([]);expect(requests.get(page)).toEqual([]);});

test('arbitrary exact address has an honest unavailable deep link, visible limits and no source calls',async({page},info)=>{
 await page.goto('/');const input=page.getByLabel('Token address',{exact:true});await input.fill(mint);await input.press('Enter');
 await expect(page).toHaveURL('/?mint='+mint);await expect(page.getByRole('heading',{name:'Onchain source unavailable',exact:true})).toBeFocused();
 await expect(page.getByText(mint,{exact:true})).toBeVisible();await expect(page.getByText('Not available — no verified response.',{exact:true})).toBeVisible();
 await expect(page.getByText('Not available — no check completed.',{exact:true})).toBeVisible();
 await expect(page.locator('.discovery')).toContainText('Captured 14 Oct 2026 · stale StonkFun examples.');
 await expect(page.locator('.onchain-intro')).toContainText('cannot confirm');await expect(page.locator('.onchain-unknowns')).toContainText('have not been checked');
 const text=await page.locator('.onchain-card').innerText();expect(text).not.toMatch(/NVDAX|NVIDIA|SpaceX|GLDX|SPCXX|14 Oct|verified at slot|guaranteed|safe token/i);
 expect(await page.locator('.answer-card').count()).toBe(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const slotBox=await page.getByText('Not available — no verified response.',{exact:true}).boundingBox(),introBox=await page.locator('.onchain-intro').boundingBox();expect(slotBox.y+slotBox.height).toBeLessThan(page.viewportSize().height);expect(introBox.y+introBox.height).toBeLessThan(page.viewportSize().height);
 writeFileSync(`experiments/consumer-mvp/web/node_modules/.cache/onchain103-unavailable-${info.project.name}.json`,JSON.stringify({viewport:page.viewportSize(),slotBox,introBox,source:'not_connected',verified:false}));
 await axe(page);await page.screenshot({path:`docs/consumer-onchain/screenshots/unavailable-${info.project.name}.png`});await page.screenshot({path:`docs/consumer-onchain/screenshots/unavailable-full-${info.project.name}.png`,fullPage:true});
 await page.reload();await expect(page.getByRole('heading',{name:'Onchain source unavailable',exact:true})).toBeVisible();await expect(input).toHaveValue(mint);
 // Editing a draft must not relabel the submitted result/address or its Explorer link.
 await input.fill(si);await expect(page.locator('.onchain-observation dd').first()).toHaveText(mint);
 await expect(page.getByRole('link',{name:'Open this address on Solana Explorer (new tab)'})).toHaveAttribute('href','https://explorer.solana.com/address/'+mint+'?cluster=mainnet-beta');
});

test('keyboard definitions, Explorer context, copy/fallback and history separate unchecked from dated evidence',async({page,context},info)=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);await page.goto('/?mint='+mint);
 const summary=page.getByText('What supply and authorities mean',{exact:true});await summary.focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('heading',{name:'Mint authority',exact:true})).toBeVisible();await expect(page.getByText(/it would not mean the token is safe/)).toBeVisible();await axe(page);
 await page.keyboard.press('Escape');await expect(summary).toBeFocused();await expect(page.locator('.onchain-definitions')).not.toHaveAttribute('open');
 await page.getByRole('button',{name:'Copy address link',exact:true}).click();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(page.url());
 await expect(page.getByText('Link copied. It shares this unchecked address, not a verified token.',{exact:true})).toBeVisible();
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true}));await page.getByRole('button',{name:'Copy address link',exact:true}).click();
 await expect(page.getByLabel('Copy this unchecked-address link',{exact:true})).toBeFocused();await expect(page.getByLabel('Copy this unchecked-address link',{exact:true})).toHaveValue(page.url());
 await page.getByRole('button',{name:/Explain Super Inu/}).click();await expect(page.getByRole('heading',{name:/^Super Inu/})).toBeFocused();
 await expect(page.locator('.answer-card')).toContainText('Buying Super Inu doesn’t mean buying NVIDIA shares or owning NVDAX.');
 await expect(page.locator('.answer-card')).toContainText('At capture · 14 Oct 2026');await expect(page.locator('.onchain-card')).toContainText('separate, stale 14 Oct 2026 capture');
 await page.screenshot({path:`docs/consumer-onchain/screenshots/historical-separate-${info.project.name}.png`,fullPage:true});
 await page.goBack();await expect(page.getByRole('heading',{name:'Onchain source unavailable',exact:true})).toBeFocused();await expect(page.getByLabel('Token address',{exact:true})).toHaveValue(mint);
 await page.goForward();await expect(page.getByRole('heading',{name:/^Super Inu/})).toBeFocused();await expect(page.getByRole('button',{name:'Search another token',exact:true})).toHaveAttribute('aria-expanded','false');
});

test('no query activation, unsupported-success claim or Safari-selector dependence',async({page})=>{
 await page.goto('/?mint='+mint+'&fixture=verified&rpc=https%3A%2F%2Frpc.invalid&activation=enabled&slot=9999999999');
 await expect(page.getByRole('heading',{name:'Onchain source unavailable',exact:true})).toBeVisible();
 const main=await page.locator('main').innerText();expect(main).not.toContain('9999999999');expect(main).not.toContain('rpc.invalid');
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);await page.getByRole('button',{name:'Copy address link',exact:true}).click();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(new URL('/?mint='+mint,page.url()).href);
 await page.evaluate(()=>{function strip(sheet){for(const rule of [...sheet.cssRules]){if(rule.selectorText?.includes(':has('))sheet.deleteRule([...sheet.cssRules].indexOf(rule));else if(rule.cssRules)strip(rule);}}for(const sheet of document.styleSheets)strip(sheet);});
 await expect(page.getByRole('heading',{name:'Onchain source unavailable',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(const control of await page.locator('.onchain-card button,.onchain-card summary,.onchain-card a').all()){const box=await control.boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);}
 await page.getByLabel('Token address',{exact:true}).fill('<script>alert(1)</script>');await page.getByLabel('Token address',{exact:true}).press('Enter');
 await expect(page.getByRole('heading',{name:'That doesn’t look like a token address',exact:true})).toBeFocused();await expect(page.locator('.onchain-card')).toHaveCount(0);
 await page.goto('/?mint='+mint+'&mint='+si);await expect(page.getByRole('heading',{name:'That doesn’t look like a token address',exact:true})).toBeVisible();await expect(page.locator('.onchain-card')).toHaveCount(0);
});
