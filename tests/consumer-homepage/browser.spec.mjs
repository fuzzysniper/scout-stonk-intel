import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const examples=[
 {mint:'DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP',name:'Super Inu',symbol:'SI',quote:'NVDAX',quoteMint:'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh'},
 {mint:'HTmQz7My6MehV7bjhJ6jde8nDND1yvsz68d24LP7YgUQ',name:'RuneScape Gold',symbol:'GP',quote:'GLDX',quoteMint:'Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re'},
 {mint:'6HU4CmRb15C2nQDx8Ld2f2W2wTdmog6aZiiXdrT5Pzi8',name:'Grokification',symbol:'GROK',quote:'SPCXX',quoteMint:'Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8'},
];
const errors=new WeakMap(),external=new WeakMap();
test.beforeEach(async({page})=>{
 // Historical UX regression uses an explicitly disabled API contract replay, never success.
 await page.route('**/api/mint-facts?*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({version:'mint-facts/1',status:'unavailable',mint:new URL(route.request().url()).searchParams.get('mint'),facts:null,source:null,reason:'disabled',warnings:[]})}));
 const e=[],x=[];errors.set(page,e);external.set(page,x);
 page.on('response',r=>{if(r.status()>=400&&!new URL(r.url()).pathname.startsWith('/api/mint-facts'))e.push('HTTP '+r.status()+' '+new URL(r.url()).pathname);});
 page.on('pageerror',v=>e.push(v.message));page.on('console',v=>{if(v.type()==='error'&&!(v.text().startsWith('Failed to load resource')&&v.location().url.includes('/api/mint-facts')))e.push(v.text());});
 page.on('request',r=>{if(!['127.0.0.1','localhost'].includes(new URL(r.url()).hostname))x.push(r.url());});
});
test.afterEach(async({page})=>{expect(errors.get(page)).toEqual([]);expect(external.get(page)).toEqual([]);});
const axe=async page=>expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
const cleanBrand=async page=>{expect(await page.locator('body').innerText()).not.toMatch(/SCOUT|STORKCOIN|PROJECT CLEAR|STORK ecosystem/);expect(await page.title()).not.toMatch(/SCOUT|STORK|PROJECT CLEAR/);};
for(const token of examples)test(`${token.symbol} production engine, risks, exact share and sources`,async({page},info)=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:'A token address. A clear answer.'})).toBeVisible();
 await cleanBrand(page);await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex, nofollow');
 const lastChoice=await page.getByRole('button',{name:/Explain Grokification/}).boundingBox();expect(lastChoice.y+lastChoice.height).toBeLessThan(page.viewportSize().height);
 if(token===examples[0]){await axe(page);await page.screenshot({path:`docs/consumer-v15-ux/screenshots/after-landing-${info.project.name}.png`});}
 await page.getByRole('button',{name:new RegExp('Explain '+token.name)}).click();
 await expect(page.getByRole('heading',{name:new RegExp('^'+token.name)})).toBeVisible();
 await expect(page).toHaveURL(new RegExp('/\\?mint='+token.mint+'$'));
 await expect(page.getByText('Financial figures withheld; publication rights unverified.')).toBeVisible();
 await expect(page.getByText('Stale capture; current settings unverified.')).toBeVisible();
 if(token===examples[0])await page.screenshot({path:`docs/consumer-v15-ux/screenshots/after-answer-${info.project.name}.png`});
 const rights=await page.getByText('Financial figures withheld; publication rights unverified.').boundingBox();expect(rights.y+rights.height).toBeLessThan(page.viewportSize().height);
 const risks=await page.getByRole('heading',{name:'What’s not known'}).boundingBox();expect(risks.y+risks.height).toBeLessThan(page.viewportSize().height);
 const metrics={viewport:page.viewportSize(),risksHeading:risks,rightsWarning:rights,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)};
 expect(metrics.overflow).toBe(false);writeFileSync(`experiments/consumer-mvp/web/node_modules/.cache/mint111-layout-${token.symbol}-${info.project.name}.json`,JSON.stringify(metrics));
 const small=await page.locator('main button,main input,main summary').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<44||r.height<44);}).map(n=>n.tagName));expect(small).toEqual([]);
 await expect(page.getByLabel('Token address',{exact:true})).toBeHidden();await expect(page.getByRole('button',{name:'Search another token',exact:true})).toHaveAttribute('aria-expanded','false');
 await expect(page.getByRole('heading',{name:'How rewards are supposed to work'})).toBeVisible();await expect(page.getByText(/Holder payments and eligibility are unverified/)).toBeVisible();
 await axe(page);await cleanBrand(page);
 if(token===examples[0])await page.screenshot({path:`docs/consumer-v15-ux/screenshots/after-answer-${info.project.name}.png`});
 await page.getByRole('button',{name:'Evidence for Token and pairing'}).click();
 await expect(page.locator('.answer-card').getByText(token.mint,{exact:true})).toBeVisible();await expect(page.locator('.answer-card').getByText(token.quoteMint,{exact:true})).toBeVisible();
 await page.locator('.receipt-details > summary').first().click();
 await expect(page.getByText('Provider generated · UTC').first()).toBeVisible();
 await expect(page.getByText('2026-10-14T22:33:17.185179+00:00',{exact:true})).toBeVisible();
 expect(await page.locator('.receipt').count()).toBe(3);expect(await page.locator('a[href*="pair-reward-audit"]').count()).toBe(0);
 for(const a of await page.locator('.external-link').all())expect(await a.getAttribute('href')).toMatch(/^https:\/\/www\.stonkfun\.xyz\/api\//);
 if(token===examples[0]){await axe(page);await page.screenshot({path:`docs/consumer-v15-ux/screenshots/after-evidence-${info.project.name}.png`});}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.reload();await expect(page.getByRole('heading',{name:new RegExp('^'+token.name)})).toBeVisible();
 await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://scout.storkcoin.xyz/?mint='+token.mint);
 await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content',token.symbol+' explained · captured 14 Oct 2026');
 expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toMatch(/\/opengraph-image/);
});
test('empty, ticker, malformed, same-symbol mint, duplicate query and recovery',async({page})=>{
 await page.goto('/');
 for(const [raw,title]of [['','Start with a token address'],['SI','A name isn’t an address'],['<script>alert(1)</script>','That doesn’t look like a token address'],['1'.repeat(32),'Source not connected'],['4SsapSJFx7ZqVb2C7z78wKD4nyySjFCBSuajnZdDsx97','Source not connected'],[' '+examples[0].mint,'That doesn’t look like a token address']]){
  await page.getByLabel('Token address',{exact:true}).fill(raw);await page.getByRole('button',{name:'Explain this token',exact:true}).click();await expect(page.getByRole('heading',{name:title})).toBeVisible();if(title==='Source not connected')expect(new URL(page.url()).searchParams.get('mint')).toBe(raw);else expect(new URL(page.url()).searchParams.has('mint')).toBe(false);
 }
 await page.goto('/?mint='+examples[0].mint+'&mint='+examples[1].mint);await expect(page.getByRole('heading',{name:'That doesn’t look like a token address'})).toBeVisible();
 await page.getByRole('button',{name:/Explain Grokification/}).click();await expect(page.getByRole('heading',{name:/^Grokification/})).toBeVisible();await cleanBrand(page);
});
test('keyboard, clipboard fallback, history, restart and pre-capture failure',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);await page.goto('/?mint='+examples[0].mint);
 const summary=page.locator('.evidence > summary');await summary.focus();await page.keyboard.press('Enter');await expect(page.locator('.evidence')).toHaveAttribute('open','');
 await page.keyboard.press('Escape');await expect(page.locator('.evidence')).not.toHaveAttribute('open');
 await page.getByRole('button',{name:'Copy link',exact:true}).click();await expect(page.getByText('Link copied. It opens this captured example.')).toBeVisible();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(page.url());
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined}));await page.getByRole('button',{name:'Copy link',exact:true}).click();await expect(page.getByLabel('Copy this exact-mint link')).toHaveValue(page.url());
 await page.getByRole('button',{name:'Search another token',exact:true}).click();await expect(page.getByLabel('Token address',{exact:true})).toBeFocused();
 await page.getByLabel('Token address',{exact:true}).fill(examples[1].mint);await page.getByRole('button',{name:'Explain this token',exact:true}).click();await expect(page.getByRole('heading',{name:/^RuneScape Gold/})).toBeVisible();
 await page.goBack();await expect(page.getByRole('heading',{name:/^Super Inu/})).toBeVisible();await page.goForward();await expect(page.getByRole('heading',{name:/^RuneScape Gold/})).toBeVisible();
 await page.getByRole('link',{name:'Start over'}).click();await expect(page.getByRole('heading',{name:'A token address. A clear answer.'})).toBeVisible();await expect(page.getByLabel('Token address',{exact:true})).toHaveValue('');await expect(page.getByRole('heading',{name:'A token address. A clear answer.'})).toBeFocused();
 await page.clock.setFixedTime(new Date('2026-10-01T00:00:00Z'));await page.getByRole('button',{name:/Explain Super Inu/}).click();await expect(page.getByRole('heading',{name:'Evidence couldn’t load'})).toBeVisible();
 await page.clock.setFixedTime(new Date('2026-10-17T22:00:00Z'));await page.getByRole('button',{name:'Try again'}).click();await expect(page.getByRole('heading',{name:/^Super Inu/})).toBeVisible();
 expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length,cookie:document.cookie}))).toEqual({local:0,session:0,cookie:''});
});
test('real HTTP SSR, neutral PNG, existing routes and no financial source bodies',async({request,browser})=>{
 for(const t of examples){const r=await request.get('/?mint='+t.mint);expect(r.status()).toBe(200);expect(r.headers()['cache-control']).toContain('no-store');const baseline=JSON.parse(readFileSync('tests/consumer-homepage/baseline-headers.json','utf8'));const headers=Object.fromEntries(Object.keys(baseline.headers).map(k=>[k,r.headers()[k]??null]));expect(headers).toEqual(baseline.headers);writeFileSync('experiments/consumer-mvp/web/node_modules/.cache/mint111-headers.json',JSON.stringify(headers));const text=await r.text();expect(text).toContain(t.name);expect(text).toContain('Financial figures withheld');
  for(const marker of ['distributedRaw','distributedTokens','totalDistributed','amountRaw','priceUsd','apy'])expect(text).not.toContain('"'+marker+'":');
 }
 const icon=await request.get('/favicon.ico');expect(icon.status()).toBe(200);expect([...(await icon.body()).subarray(0,6)]).toEqual([0,0,1,0,1,0]);
 const png=await request.get('/opengraph-image');expect(png.status()).toBe(200);expect(png.headers()['content-type']).toContain('image/png');expect([...(await png.body()).subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
 writeFileSync('experiments/consumer-mvp/web/node_modules/.cache/next-homepage-og.png',await png.body());
 for(const path of ['/terminal','/research','/research/history','/radar','/status','/brief'])expect((await request.get(path)).status(),path).toBe(200);
 expect((await request.get('/api/history?mint=bad')).status()).toBe(400);expect((await request.get('/api/og?mint=bad')).status()).toBe(400);
 const oldPng=await request.get('/terminal/opengraph-image');expect(oldPng.status()).toBe(200);expect(oldPng.headers()['content-type']).toContain('image/png');expect([...(await oldPng.body()).subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
 const legacy=await request.get('/terminal?mint='+examples[0].mint);expect(legacy.status()).toBe(200);expect(await legacy.text()).toContain('SCOUT');expect(await legacy.text()).toContain('/api/og?mint='+examples[0].mint);
 const nojs=await browser.newContext({javaScriptEnabled:false});const p=await nojs.newPage();await p.goto('http://127.0.0.1:4180/?mint='+examples[0].mint);await expect(p.getByRole('heading',{name:/^Super Inu/})).toBeVisible();await expect(p.getByText('Financial figures withheld; publication rights unverified.')).toBeVisible();await nojs.close();
 // Check actual bundled assets too: no restricted raw audit document or financial payload.
 const build=JSON.parse(readFileSync('.next/app-build-manifest.json','utf8'));for(const file of build.pages['/page']){if(!file.endsWith('.js'))continue;const js=readFileSync('.next/'+file,'utf8');expect(js).not.toContain('distributedRaw');expect(js).not.toContain('amountRaw');expect(js).not.toContain('18446744073.709551615');expect(js).not.toContain('LOCAL SYNTHETIC/OFFLINE HARNESS');}
});

test('compact search is accessible, cancels drafts, preserves errors and resets on history',async({page},info)=>{
 await page.goto('/?mint='+examples[0].mint);
 const toggle=page.getByRole('button',{name:'Search another token',exact:true}),input=page.getByLabel('Token address',{exact:true});
 await expect(input).toBeHidden();const target=await toggle.boundingBox();expect(target.height).toBeGreaterThanOrEqual(44);expect(target.width).toBeGreaterThanOrEqual(44);await toggle.focus();await page.keyboard.press('Enter');await expect(toggle).toHaveAttribute('aria-expanded','true');await expect(input).toBeFocused();
 await expect(page.getByPlaceholder('Paste a token address')).toBeVisible();await expect(page.getByRole('button',{name:'Explain this token',exact:true})).toBeVisible();
 await input.fill('unfinished draft');await page.keyboard.press('Escape');await expect(input).toBeHidden();await expect(toggle).toBeFocused();await expect(page).toHaveURL(new RegExp('mint='+examples[0].mint+'$'));
 await toggle.click();await expect(input).toHaveValue(examples[0].mint);await expect(input).toBeFocused();await axe(page);
 await page.screenshot({path:`docs/consumer-v15-ux/screenshots/after-search-${info.project.name}.png`});
 await page.getByRole('button',{name:'Cancel search',exact:true}).click();await expect(toggle).toBeFocused();await expect(input).toBeHidden();
 await toggle.click();await input.fill('1'.repeat(32));await page.getByRole('button',{name:'Explain this token',exact:true}).click();await expect(page.getByRole('heading',{name:'Source not connected'})).toBeVisible();await expect(input).toBeVisible();await expect(toggle).toHaveCount(0);
 await expect(page.locator('.answer-card')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Explore an example'})).toBeVisible();
 await page.goBack();await expect(page.getByRole('heading',{name:/^Super Inu/})).toBeVisible();await expect(input).toBeHidden();await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(page.getByRole('heading',{name:/^Super Inu/})).toBeFocused();
 await toggle.click();await input.fill(examples[2].mint);await input.press('Enter');await expect(page.getByRole('heading',{name:/^Grokification/})).toBeVisible();await expect(input).toBeHidden();
 await page.reload();await expect(input).toBeHidden();await expect(page.getByRole('heading',{name:/^Grokification/})).toBeVisible();
});

// These checks measure UI friction; they do not stand in for comprehension testing.
test('examples expose recognizable names without an extra tap or losing a first-viewport choice',async({page},info)=>{
 await page.goto('/');
 const choices=[];
 for(const t of examples){
  const button=page.getByRole('button',{name:new RegExp('Explain '+t.name)});
  await expect(button.locator('.example-name')).toHaveText(t.name);
  await expect(button.locator('.example-icon')).toHaveText(t.symbol);
  await expect(button.locator('.example-quote')).toHaveText('with '+t.quote);
  const box=await button.boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);expect(box.width).toBeGreaterThanOrEqual(44);expect(box.y+box.height).toBeLessThan(page.viewportSize().height);
  const iconFits=await button.locator('.example-icon').evaluate(n=>{const range=document.createRange();range.selectNodeContents(n);return range.getBoundingClientRect().width<=n.getBoundingClientRect().width;});expect(iconFits).toBe(true);
  const textBox=await button.locator('.example-name').boundingBox();expect(textBox.x+textBox.width).toBeLessThanOrEqual(box.x+box.width);
  choices.push({name:t.name,symbol:t.symbol,box});
 }
 writeFileSync(`experiments/consumer-mvp/web/node_modules/.cache/mint111-discovery-${info.project.name}.json`,JSON.stringify({choices}));
 await page.getByRole('button',{name:/Explain RuneScape Gold/}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:/^RuneScape Gold/})).toBeFocused();
 await expect(page.locator('.plain-english')).toContainText('doesn’t mean owning gold or owning GLDX');
 await expect(page.locator('.plain-english')).toContainText('StonkFun labels');
});

test('source links precede technical data, retain every captured receipt field and work with keyboard',async({page},info)=>{
 await page.goto('/?mint='+examples[0].mint);
 const summary=page.locator('.evidence > summary');await summary.focus();await page.keyboard.press('Enter');
 await summary.evaluate(n=>window.scrollTo(0,scrollY+n.getBoundingClientRect().top));
 const first=page.locator('.receipt').first(),link=first.locator('.external-link'),technical=first.locator('.receipt-details');
 await expect(link).toBeVisible();await expect(link).toHaveAccessibleName('Quote registry at capture: Source endpoint · may have changed (opens in a new tab)');await expect(first.getByText('Captured · UTC',{exact:true})).toBeVisible();
 await expect(technical).not.toHaveAttribute('open');await expect(first.getByText('Receipt SHA-256',{exact:true})).toBeHidden();
 const linkBox=await link.boundingBox();expect(linkBox.y+linkBox.height).toBeLessThan(page.viewportSize().height);expect(linkBox.height).toBeGreaterThanOrEqual(44);
 const sourceLinkOffsetFromSummary=await page.evaluate(()=>document.querySelector('.external-link').getBoundingClientRect().top-document.querySelector('.evidence > summary').getBoundingClientRect().top);
 expect(sourceLinkOffsetFromSummary).toBeLessThan(400);
 await page.screenshot({path:`docs/consumer-v15-ux/screenshots/after-sources-${info.project.name}.png`});
 const captured=await page.locator('.receipt').evaluateAll(nodes=>nodes.map(n=>({heading:n.querySelector('h3').textContent,url:n.querySelector('a').href,fields:Object.fromEntries([...n.querySelectorAll('.receipt-line')].map(f=>[f.querySelector('dt').textContent,f.querySelector('dd').textContent]))})));
 const baseline=JSON.parse(readFileSync('docs/consumer-usability/before-metrics.json','utf8')).records.find(r=>r.width===page.viewportSize().width);
 expect(captured).toEqual(baseline.receipts); // Original source values, not rewritten dates/hashes.
 writeFileSync(`experiments/consumer-mvp/web/node_modules/.cache/mint111-sources-${info.project.name}.json`,JSON.stringify({sourceLinkOffsetFromSummary,linkBox}));
 await technical.locator('summary').focus();await page.keyboard.press('Enter');await expect(first.getByText('Receipt SHA-256',{exact:true})).toBeVisible();await axe(page);
 await page.keyboard.press('Enter');await expect(technical).not.toHaveAttribute('open');
 await page.getByRole('button',{name:'Evidence for How rewards are supposed to work',exact:true}).click();
 const focused=page.locator('.receipt:focus');await expect(focused).toHaveCount(1);await expect(focused.locator('.external-link')).toBeVisible();
 // Observe external navigation without making a provider request or claiming a refresh.
 const href=await focused.locator('a').getAttribute('href'),context=page.context();
 await context.route('https://www.stonkfun.xyz/**',route=>route.fulfill({status:200,contentType:'text/plain',body:'Navigation intercepted for offline QA; not provider evidence.'}));
 const popupPromise=page.waitForEvent('popup');await focused.locator('a').click();const popup=await popupPromise;await popup.waitForLoadState();expect(popup.url()).toBe(href);expect(await popup.evaluate(()=>window.opener===null)).toBe(true);await popup.close();
 await page.keyboard.press('Escape');await expect(page.locator('.evidence')).not.toHaveAttribute('open');await expect(summary).toBeFocused();
});

test('compact risks survive removal of :has selectors and search/history transitions',async({page},info)=>{
 const records=[];
 for(const t of examples){
  await page.goto('/?mint='+t.mint);await expect(page.getByRole('heading',{name:new RegExp('^'+t.name)})).toBeVisible();
  const rights=page.getByText('Financial figures withheld; publication rights unverified.');const before=await rights.boundingBox();
  // CSSOM removal simulates absent selector support; this is not a Safari device test.
  await page.evaluate(()=>{function strip(sheet){for(const rule of [...sheet.cssRules]){if(rule.selectorText?.includes(':has('))sheet.deleteRule([...sheet.cssRules].indexOf(rule));else if(rule.cssRules)strip(rule);}}for(const sheet of document.styleSheets)strip(sheet);});
  const after=await rights.boundingBox();expect(after.y+after.height).toBeLessThan(page.viewportSize().height);expect(after.y).toBe(before.y);
  records.push({symbol:t.symbol,rightsBottom:after.y+after.height,unchangedWithoutHas:after.y===before.y});
  await page.getByRole('button',{name:'Search another token',exact:true}).click();await expect(page.getByLabel('Token address',{exact:true})).toBeFocused();
  await page.keyboard.press('Escape');await expect(page.getByLabel('Token address',{exact:true})).toBeHidden();
  expect((await rights.boundingBox()).y).toBe(after.y);
 }
 writeFileSync(`experiments/consumer-mvp/web/node_modules/.cache/mint111-fallback-${info.project.name}.json`,JSON.stringify({records}));
 await page.getByRole('button',{name:'Search another token',exact:true}).click();await page.getByLabel('Token address',{exact:true}).fill(examples[0].mint);await page.getByLabel('Token address',{exact:true}).press('Enter');
 await page.goBack();await expect(page.getByRole('heading',{name:/^Grokification/})).toBeFocused();await expect(page.getByLabel('Token address',{exact:true})).toBeHidden();
 await page.goForward();await expect(page.getByRole('heading',{name:/^Super Inu/})).toBeFocused();await expect(page.getByLabel('Token address',{exact:true})).toBeHidden();
});
