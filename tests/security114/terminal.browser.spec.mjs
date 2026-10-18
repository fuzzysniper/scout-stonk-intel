// Explicit SYNTHETIC/OFFLINE response fixtures; never current facts or screenshots.
import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
import {rewardUiFixture} from '../reward-evidence-ui-fixtures.mjs';
import {address} from '../pairs-fixtures.mjs';
const {catalog,registry}=await rewardUiFixture(f=>{
 f.store={};
 const seed=f.rows[0];f.rows=Array.from({length:6},(_,i)=>({...seed,mint:i?address(50+i):seed.mint,
  name:'Synthetic offline token '+i,symbol:'TEST'+i,market:{liquidityUsd:i===5?null:100-i,volume24hUsd:i}}));
});
test('SYNTHETIC OFFLINE terminal: six 65px rows, sorts, quick view, exact dossier and folded evidence',async({page})=>{
 const unexpected=[];
 await page.route('**/api/**',async route=>{
  const u=new URL(route.request().url());
  if(u.pathname==='/api/pair-quotes'){
   const r=structuredClone(registry);r.search={query:(u.searchParams.get('query')??'').toLowerCase(),mint:u.searchParams.get('mint'),offset:0,limit:12};
   return route.fulfill({json:r});
  }
  if(u.pathname==='/api/pairs')return route.fulfill({json:catalog});
  // Deliberately unavailable sources: no historical or holder-return inventions.
  if(['/api/radar','/api/token','/api/rewards','/api/history'].includes(u.pathname))return route.fulfill({status:503,json:{status:'unavailable'}});
  unexpected.push(u.pathname);return route.abort();
 });
 await page.goto('/terminal');const search=page.getByRole('combobox',{name:'Search quote assets'});
 await search.fill('NVDAX');await expect(page.getByRole('option')).toHaveCount(1);await search.press('ArrowDown');await search.press('Enter');
 const rows=page.locator('.pair-token');await expect(rows).toHaveCount(6);
 expect(await rows.evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().height))).toEqual([65,65,65,65,65,65]);
 expect(await page.evaluate(()=>document.activeElement.tagName)).toBe('H2');
 for(const [sort,symbol] of [['volume, high to low','TEST5'],['name, A to Z','TEST0'],['liquidity, high to low','TEST0']]){
  await page.getByRole('button',{name:'Sort sample by '+sort,exact:true}).click();
  await expect(rows.first().locator('h3')).toHaveText(symbol);
 }
 await expect(rows.last().locator('.pair-liquidity dd')).toHaveText('—Unavailable');
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
 const first=rows.first(),toggle=first.getByRole('button',{name:/^Details for/});await toggle.click();
 await expect(first.locator('.quick-market')).toBeVisible();await expect(first.locator('.quick-market dd')).toHaveText(['$100','$0']);
 await expect(first.locator('.quick-technical')).not.toHaveAttribute('open');
 await first.locator('.quick-technical > summary').focus();await page.keyboard.press('Enter');await expect(first.locator('.quick-technical')).toHaveAttribute('open','');
 await page.keyboard.press('Escape');await expect(toggle).toBeFocused();await expect(toggle).toHaveAttribute('aria-expanded','false');
 await toggle.click();await first.getByRole('link',{name:'Open dossier →',exact:true}).click();
 const mint=catalog.groups[0].tokens[0].mint;await expect(page).toHaveURL(new RegExp('/terminal\\?mint='+mint+'$'));
 await expect(page.getByRole('heading',{name:'Token dossier',exact:true})).toBeVisible();
 await expect(page.locator('.dossier-details')).not.toHaveAttribute('open');
 await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content',new RegExp('/api/og\\?mint='+mint+'$'));
 expect(await page.evaluate(()=>document.activeElement.matches('input,textarea,[contenteditable]'))).toBe(false);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
 expect(unexpected).toEqual([]);
});
