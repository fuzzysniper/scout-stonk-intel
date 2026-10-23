import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {captureMetadataAudit,emittedMetadata} from './metadata-audit.mjs';
const out='docs/unfarmd-consumer-v1/launch-polish';
const activity=new WeakMap();
const axe=async page=>expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
test.beforeEach(async({page})=>{
 const a={api:[],external:[],errors:[]};activity.set(page,a);
 page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))a.api.push(u.pathname);if(!['localhost','127.0.0.1'].includes(u.hostname))a.external.push(u.host);});
 page.on('pageerror',e=>a.errors.push(e.message));
 await page.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 await page.route('**/api/**',r=>r.abort());
 mkdirSync(out+'/screenshots',{recursive:true});
});
test.afterEach(async({page})=>{expect(activity.get(page).external).toEqual([]);expect(activity.get(page).errors).toEqual([]);});

test('optimized first screen preserves the approved hero, copy, accessible CTA and passive input',async({page},info)=>{
 await page.goto('/');await page.locator('.escape-art img').evaluate(i=>i.decode());
 await expect(page.getByRole('heading',{name:'Stop getting farmed. Know what you’re aping.',exact:true})).toBeVisible();
 await expect(page.locator('#mint')).toHaveAttribute('placeholder','Paste Solana token address');
 const cta=await page.getByRole('button',{name:'SCOUT IT',exact:true}).boundingBox();expect(cta.y).toBeGreaterThan(0);expect(cta.y+cta.height).toBeLessThan(page.viewportSize().height);expect(cta.height).toBeGreaterThanOrEqual(44);
 expect(await page.locator('.primary').evaluate(e=>{const b=e.getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('button')===e;})).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await axe(page);
 await page.screenshot({path:`${out}/screenshots/after-home-${info.project.name}.png`});
 await page.locator('#mint').fill('So11111111111111111111111111111111111111112');await expect(page.locator('#mint')).toBeFocused();expect(activity.get(page).api).toEqual([]);
 writeFileSync(`${out}/first-screen-${info.project.name}.json`,JSON.stringify({build:'optimized main acd72f2 + frontend a10bf94 + launch-polish changes',viewport:page.viewportSize(),cta,apiRequests:0,externalRequests:0,axeViolations:0,heroAndCopyUnchanged:true},null,2)+'\n');
});

test('actual homepage head selects one Outlier favicon and native Apple PNG without consumer override',async({page,request},info)=>{
 await page.goto('/');const home=await emittedMetadata(page);
 await expect(page.locator('link[rel=icon]')).toHaveCount(1);await expect(page.locator('link[rel=icon]')).toHaveAttribute('href',/^\/icon\.svg\?/);
 await expect(page.locator('link[rel=apple-touch-icon]')).toHaveCount(1);await expect(page.locator('link[rel=apple-touch-icon]')).toHaveAttribute('sizes','180x180');
 expect(home.icons.some(x=>x.href.includes('scout-avatar'))).toBe(false);
 const icon=await request.get(home.icons.find(x=>x.rel==='icon').href);expect(icon.status()).toBe(200);expect(icon.headers()['content-type']).toContain('image/svg+xml');expect(await icon.text()).toBe(readFileSync('app/icon.svg','utf8'));
 const apple=await request.get(home.icons.find(x=>x.rel==='apple-touch-icon').href);expect(apple.status()).toBe(200);expect(apple.headers()['content-type']).toContain('image/png');
 const appleBytes=await apple.body(),metadata=await sharp(appleBytes).metadata();expect([metadata.width,metadata.height]).toEqual([180,180]);
 const rgba=await sharp(appleBytes).ensureAlpha().raw().toBuffer();const pixel=(x,y)=>[...rgba.subarray((y*180+x)*4,(y*180+x)*4+4)];expect(pixel(1,1)).toEqual([25,30,24,255]);expect(pixel(90,120)).toEqual([232,224,205,255]);
 const og=home.metas.find(x=>x.name==='og:image').content;const social=await request.get(new URL(og).pathname);expect(social.status()).toBe(200);expect(social.headers()['content-type']).toContain('image/png');const png=await social.body(),size=await sharp(png).metadata();expect([size.width,size.height]).toEqual([1200,630]);expect([...png.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
 for(const name of ['description','og:description','twitter:description'])expect(home.metas.find(x=>x.name===name).content).toContain('Live checks restricted');
 expect(home.metas.find(x=>x.name==='robots').content).toBe('noindex, nofollow');expect(activity.get(page).api).toEqual([]);
 if(info.project.name==='1280'){
  writeFileSync(`${out}/social-preview.png`,png);writeFileSync(`${out}/apple-icon.png`,appleBytes);
  await page.goto('/research/history');const history=await emittedMetadata(page);
  await captureMetadataAudit(page,home,history,`${out}/screenshots/after-metadata.png`);
  writeFileSync(`${out}/after-metadata.json`,JSON.stringify({home,history,icon:{status:icon.status(),type:icon.headers()['content-type']},apple:{status:apple.status(),width:180,height:180,sha256:createHash('sha256').update(appleBytes).digest('hex')},social:{status:social.status(),width:1200,height:630,sha256:createHash('sha256').update(png).digest('hex')},authenticHeliusObservation:false},null,2)+'\n');
 }
});

test('historical research share text describes the dated page, with rights gates, canonical and noindex',async({page})=>{
 await page.goto('/research/history');await expect(page).toHaveTitle('Historical Research | SCOUT');
 for(const selector of ['meta[property="og:title"]','meta[name="twitter:title"]'])await expect(page.locator(selector)).toHaveAttribute('content','Historical Research | SCOUT');
 for(const selector of ['meta[name=description]','meta[property="og:description"]','meta[name="twitter:description"]'])await expect(page.locator(selector)).toHaveAttribute('content',/Historical, not current\. Financial figures gated pending rights approval/);
 await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://scout.storkcoin.xyz/research/history');await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content','https://scout.storkcoin.xyz/research/history');await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','noindex, nofollow');
 expect(activity.get(page).api).toEqual([]);
});

test('landscape, dark mode, 200% CSS layout-zoom proxy and keyboard reflow remain usable',async({page})=>{
 await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await page.goto('/');await page.evaluate(()=>document.documentElement.style.zoom='2');
 await page.locator('#mint').fill('not an address');await page.locator('#mint').press('Tab');await expect(page.getByRole('button',{name:'Paste token address',exact:true})).toBeFocused();await page.keyboard.press('Tab');const cta=page.getByRole('button',{name:'SCOUT IT',exact:true});await expect(cta).toBeFocused();await expect(cta).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>document.documentElement.style.zoom='');await page.setViewportSize({width:844,height:390});await page.reload();await page.getByRole('link',{name:'UNFARMD · Start over',exact:true}).focus();await expect(page.getByRole('link',{name:'UNFARMD · Start over',exact:true})).toBeFocused();await page.locator('#mint').fill('not an address');await page.keyboard.press('Tab');await page.keyboard.press('Tab');await expect(cta).toBeFocused();await expect(cta).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(activity.get(page).api).toEqual([]);await axe(page);
});
