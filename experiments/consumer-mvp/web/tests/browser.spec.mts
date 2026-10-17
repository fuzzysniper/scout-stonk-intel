import {test,expect,type Page} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import {EXAMPLES} from '../src/evidence.mjs';

const allErrors=new WeakMap<Page,string[]>(),allExternal=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{
  const errors:string[]=[],external:string[]=[];allErrors.set(page,errors);allExternal.set(page,external);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('request',request=>{if(!/^(127\.0\.0\.1|localhost)$/.test(new URL(request.url()).hostname))external.push(request.url());});
});
test.afterEach(async({page})=>{expect(allErrors.get(page)).toEqual([]);expect(allExternal.get(page)).toEqual([]);});

for(const token of EXAMPLES) {
  test(`${token.symbol}: exact-mint golden path, sources, accessible share URL`,async({page},info)=>{
    await page.goto('/');
    await expect(page.getByRole('heading',{name:'A token address. A clear answer.'})).toBeVisible();
    await expect(page.getByText('Captured examples, not live data.')).toBeVisible();
    if(token===EXAMPLES[0]) await page.screenshot({path:`docs/screenshots/landing-${info.project.name}.png`});
    await page.getByLabel('Solana token mint').fill(token.mint);
    await page.getByRole('button',{name:'Explain token'}).click();
    await expect(page.getByRole('heading',{name:new RegExp('^'+token.name)})).toBeVisible();
    await expect(page.getByRole('heading',{name:'What’s verified'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'What’s not known'})).toBeVisible();
    await expect(page.getByText('Financial figures withheld; publication rights unverified.')).toBeVisible();
    const risks=await page.getByRole('heading',{name:'What’s not known'}).boundingBox();
    expect(risks && risks.y+risks.height < (page.viewportSize()?.height??0)).toBeTruthy();
    writeFileSync(`node_modules/.cache/layout-${token.symbol}-${info.project.name}.json`,JSON.stringify({token:token.symbol,viewport:page.viewportSize(),risksHeading:risks,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),mode:'real pinned captured engine; default evaluation clock'}));
    await expect(page).toHaveURL(new RegExp('mint='+token.mint));
    if(token===EXAMPLES[0]) await page.screenshot({path:`docs/screenshots/answer-${info.project.name}.png`});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    const smallTargets=await page.locator('main button, main input, main summary').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<44||r.height<44);}).map(n=>n.tagName));
    expect(smallTargets).toEqual([]);
    const issues=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    expect(issues.violations).toEqual([]);
    await page.getByRole('button',{name:'Evidence for Token and pair identity'}).click();
    await expect(page.getByText(token.mint,{exact:true})).toBeVisible();
    await expect(page.getByText(token.quoteMint,{exact:true})).toBeVisible();
    await expect(page.getByText('Provider generated · UTC').first()).toBeVisible();
    if(token===EXAMPLES[0]) {
      await page.screenshot({path:`docs/screenshots/evidence-${info.project.name}.png`});
      expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
    }
    for(const link of await page.locator('.external-link').all())expect(await link.getAttribute('href')).toMatch(/^https:\/\/(github\.com|www\.stonkfun\.xyz)\//);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    await page.reload();
    await expect(page.getByRole('heading',{name:new RegExp('^'+token.name)})).toBeVisible();
  });
}

test('ticker disambiguation, invalid/empty/unsupported states and curated recovery',async({page})=>{
  await page.goto('/');
  for(const [input,title]of [['SI','A ticker isn’t an identity'],['','Start with a mint'],['<script>alert(1)</script>','That doesn’t look like a mint'],['1'.repeat(32),'Not in these examples'],['4SsapSJFx7ZqVb2C7z78wKD4nyySjFCBSuajnZdDsx97','Not in these examples']]){
    await page.getByLabel('Solana token mint').fill(input);await page.getByRole('button',{name:'Explain token'}).click();
    await expect(page.getByRole('heading',{name:title})).toBeVisible();expect(new URL(page.url()).searchParams.has('mint')).toBeFalsy();
  }
  await page.getByRole('button',{name:/Explain Grokification/}).click();
  await expect(page.getByRole('heading',{name:/^Grokification/})).toBeVisible();
});

test('real engine rejects a pre-capture device clock and recovers on explicit retry',async({page})=>{
  await page.clock.setFixedTime(new Date('2026-10-01T00:00:00Z'));
  await page.goto('/');await page.getByRole('button',{name:/Explain Super Inu/}).click();
  await expect(page.getByRole('heading',{name:'Evidence couldn’t load'})).toBeVisible();
  await expect(page.getByText(/No live provider was queried/)).toBeVisible();
  await page.clock.setFixedTime(new Date('2026-10-17T18:00:00Z'));
  await page.getByRole('button',{name:'Try again'}).click();
  await expect(page.getByRole('heading',{name:/^Super Inu/})).toBeVisible();
});

test('keyboard details, clipboard fallback, feedback privacy and back/forward navigation',async({page,context})=>{
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.goto('/?mint='+EXAMPLES[0].mint);
  await expect(page.getByRole('heading',{name:/^Super Inu/})).toBeVisible();
  const details=page.locator('.evidence > summary');await details.focus();await page.keyboard.press('Enter');
  await expect(page.locator('.evidence')).toHaveAttribute('open','');await page.keyboard.press('Space');await expect(page.locator('.evidence')).not.toHaveAttribute('open');
  await page.getByRole('button',{name:'Copy link'}).click();
  await expect(page.getByText('Link copied. It opens this captured example.')).toBeVisible();
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(page.url());
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined}));
  await page.getByRole('button',{name:'Copy link'}).click();await expect(page.getByLabel('Copy this exact-mint link')).toHaveValue(page.url());
  await page.getByText('Tester feedback',{exact:true}).click();await page.getByLabel('What did this explain well—or leave unclear?').fill('The quote is not what I own.');
  await page.getByRole('button',{name:'Copy feedback'}).click();await expect(page.getByText(/Clipboard access is unavailable; nothing was sent/)).toBeVisible();
  expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length,cookie:document.cookie}))).toEqual({local:0,session:0,cookie:''});
  await page.getByLabel('Solana token mint').fill(EXAMPLES[1].mint);await page.getByRole('button',{name:'Explain token'}).click();
  await expect(page.getByRole('heading',{name:/^RuneScape Gold/})).toBeVisible();
  await page.goBack();await expect(page.getByRole('heading',{name:/^Super Inu/})).toBeVisible();
  await page.goForward();await expect(page.getByRole('heading',{name:/^RuneScape Gold/})).toBeVisible();
});
