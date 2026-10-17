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
 const e=[],x=[];errors.set(page,e);external.set(page,x);
 page.on('pageerror',v=>e.push(v.message));page.on('console',v=>{if(v.type()==='error')e.push(v.text());});
 page.on('request',r=>{if(!['127.0.0.1','localhost'].includes(new URL(r.url()).hostname))x.push(r.url());});
});
test.afterEach(async({page})=>{expect(errors.get(page)).toEqual([]);expect(external.get(page)).toEqual([]);});
const axe=async page=>expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
const cleanBrand=async page=>{expect(await page.locator('body').innerText()).not.toMatch(/SCOUT|STORKCOIN|PROJECT CLEAR|STORK ecosystem/);expect(await page.title()).not.toMatch(/SCOUT|STORK|PROJECT CLEAR/);};
for(const token of examples)test(`${token.symbol} production engine, risks, exact share and sources`,async({page},info)=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:'A token address. A clear answer.'})).toBeVisible();
 await cleanBrand(page);await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex, nofollow');
 const lastChoice=await page.getByRole('button',{name:/Explain Grokification/}).boundingBox();expect(lastChoice.y+lastChoice.height).toBeLessThan(page.viewportSize().height);
 if(token===examples[0]){await axe(page);await page.screenshot({path:`docs/consumer-homepage/screenshots/landing-${info.project.name}.png`});}
 await page.getByRole('button',{name:new RegExp('Explain '+token.name)}).click();
 await expect(page.getByRole('heading',{name:new RegExp('^'+token.name)})).toBeVisible();
 await expect(page).toHaveURL(new RegExp('/\\?mint='+token.mint+'$'));
 await expect(page.getByText('Financial figures withheld; publication rights unverified.')).toBeVisible();
 await expect(page.getByText('Stale capture; current settings unverified.')).toBeVisible();
 const risks=await page.getByRole('heading',{name:'What’s not known'}).boundingBox();expect(risks.y+risks.height).toBeLessThan(page.viewportSize().height);
 const metrics={viewport:page.viewportSize(),risksHeading:risks,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)};
 expect(metrics.overflow).toBe(false);writeFileSync(`experiments/consumer-mvp/web/node_modules/.cache/next-layout-${token.symbol}-${info.project.name}.json`,JSON.stringify(metrics));
 const small=await page.locator('main button,main input,main summary').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<44||r.height<44);}).map(n=>n.tagName));expect(small).toEqual([]);
 await axe(page);await cleanBrand(page);
 if(token===examples[0])await page.screenshot({path:`docs/consumer-homepage/screenshots/answer-${info.project.name}.png`});
 await page.getByRole('button',{name:'Evidence for Token and pair identity'}).click();
 await expect(page.getByText(token.mint,{exact:true})).toBeVisible();await expect(page.getByText(token.quoteMint,{exact:true})).toBeVisible();
 await expect(page.getByText('Provider generated · UTC').first()).toBeVisible();
 await expect(page.getByText('2026-10-14T22:33:17.185179+00:00',{exact:true})).toBeVisible();
 expect(await page.locator('.receipt').count()).toBe(3);expect(await page.locator('a[href*="pair-reward-audit"]').count()).toBe(0);
 for(const a of await page.locator('.external-link').all())expect(await a.getAttribute('href')).toMatch(/^https:\/\/www\.stonkfun\.xyz\/api\//);
 if(token===examples[0]){await axe(page);await page.screenshot({path:`docs/consumer-homepage/screenshots/evidence-${info.project.name}.png`});}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.reload();await expect(page.getByRole('heading',{name:new RegExp('^'+token.name)})).toBeVisible();
 await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://scout.storkcoin.xyz/?mint='+token.mint);
 await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content',token.symbol+' explained · captured 14 Oct 2026');
 expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toMatch(/\/opengraph-image/);
});
test('empty, ticker, malformed, same-symbol mint, duplicate query and recovery',async({page})=>{
 await page.goto('/');
 for(const [raw,title]of [['','Start with a mint'],['SI','A ticker isn’t an identity'],['<script>alert(1)</script>','That doesn’t look like a mint'],['1'.repeat(32),'Not in these examples'],['4SsapSJFx7ZqVb2C7z78wKD4nyySjFCBSuajnZdDsx97','Not in these examples'],[' '+examples[0].mint,'That doesn’t look like a mint']]){
  await page.getByLabel('Solana token mint').fill(raw);await page.getByRole('button',{name:'Explain token',exact:true}).click();await expect(page.getByRole('heading',{name:title})).toBeVisible();expect(new URL(page.url()).searchParams.has('mint')).toBe(false);
 }
 await page.goto('/?mint='+examples[0].mint+'&mint='+examples[1].mint);await expect(page.getByRole('heading',{name:'That doesn’t look like a mint'})).toBeVisible();
 await page.getByRole('button',{name:/Explain Grokification/}).click();await expect(page.getByRole('heading',{name:/^Grokification/})).toBeVisible();await cleanBrand(page);
});
test('keyboard, clipboard fallback, history, restart and pre-capture failure',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);await page.goto('/?mint='+examples[0].mint);
 const summary=page.locator('.evidence > summary');await summary.focus();await page.keyboard.press('Enter');await expect(page.locator('.evidence')).toHaveAttribute('open','');
 await page.keyboard.press('Escape');await expect(page.locator('.evidence')).not.toHaveAttribute('open');
 await page.getByRole('button',{name:'Copy link',exact:true}).click();await expect(page.getByText('Link copied. It opens this captured example.')).toBeVisible();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(page.url());
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined}));await page.getByRole('button',{name:'Copy link',exact:true}).click();await expect(page.getByLabel('Copy this exact-mint link')).toHaveValue(page.url());
 await page.getByLabel('Solana token mint').fill(examples[1].mint);await page.getByRole('button',{name:'Explain token',exact:true}).click();await expect(page.getByRole('heading',{name:/^RuneScape Gold/})).toBeVisible();
 await page.goBack();await expect(page.getByRole('heading',{name:/^Super Inu/})).toBeVisible();await page.goForward();await expect(page.getByRole('heading',{name:/^RuneScape Gold/})).toBeVisible();
 await page.getByRole('link',{name:'Start again'}).click();await expect(page.getByRole('heading',{name:'A token address. A clear answer.'})).toBeVisible();await expect(page.getByLabel('Solana token mint')).toHaveValue('');
 await page.clock.setFixedTime(new Date('2026-10-01T00:00:00Z'));await page.getByRole('button',{name:/Explain Super Inu/}).click();await expect(page.getByRole('heading',{name:'Evidence couldn’t load'})).toBeVisible();
 await page.clock.setFixedTime(new Date('2026-10-17T22:00:00Z'));await page.getByRole('button',{name:'Try again'}).click();await expect(page.getByRole('heading',{name:/^Super Inu/})).toBeVisible();
 expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length,cookie:document.cookie}))).toEqual({local:0,session:0,cookie:''});
});
test('real HTTP SSR, neutral PNG, existing routes and no financial source bodies',async({request,browser})=>{
 for(const t of examples){const r=await request.get('/?mint='+t.mint);expect(r.status()).toBe(200);const text=await r.text();expect(text).toContain(t.name);expect(text).toContain('Financial figures withheld');
  for(const marker of ['distributedRaw','distributedTokens','totalDistributed','amountRaw','priceUsd','apy'])expect(text).not.toContain('"'+marker+'":');
 }
 const png=await request.get('/opengraph-image');expect(png.status()).toBe(200);expect(png.headers()['content-type']).toContain('image/png');expect([...(await png.body()).subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
 writeFileSync('experiments/consumer-mvp/web/node_modules/.cache/next-homepage-og.png',await png.body());
 for(const path of ['/terminal','/research','/research/history','/radar','/status','/brief'])expect((await request.get(path)).status(),path).toBe(200);
 expect((await request.get('/api/history?mint=bad')).status()).toBe(400);expect((await request.get('/api/og?mint=bad')).status()).toBe(400);
 const oldPng=await request.get('/terminal/opengraph-image');expect(oldPng.status()).toBe(200);expect(oldPng.headers()['content-type']).toContain('image/png');expect([...(await oldPng.body()).subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
 const legacy=await request.get('/terminal?mint='+examples[0].mint);expect(legacy.status()).toBe(200);expect(await legacy.text()).toContain('SCOUT');
 const nojs=await browser.newContext({javaScriptEnabled:false});const p=await nojs.newPage();await p.goto('http://127.0.0.1:4180/?mint='+examples[0].mint);await expect(p.getByRole('heading',{name:/^Super Inu/})).toBeVisible();await expect(p.getByText('Financial figures withheld; publication rights unverified.')).toBeVisible();await nojs.close();
 // Check actual bundled assets too: no restricted raw audit document or financial payload.
 const build=JSON.parse(readFileSync('.next/app-build-manifest.json','utf8'));for(const file of build.pages['/page']){if(!file.endsWith('.js'))continue;const js=readFileSync('.next/'+file,'utf8');expect(js).not.toContain('distributedRaw');expect(js).not.toContain('amountRaw');}
});
