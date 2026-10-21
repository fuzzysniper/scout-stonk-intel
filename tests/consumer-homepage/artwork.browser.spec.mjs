import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const out='docs/unfarmd-consumer-v1/artwork/qa';
const mint='So11111111111111111111111111111111111111112';
const activity=new WeakMap();
const axe=async page=>expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
const action=async page=>{
 const b=await page.getByRole('button',{name:'SCOUT IT',exact:true}).boundingBox();expect(b.y).toBeGreaterThanOrEqual(0);expect(b.y+b.height).toBeLessThanOrEqual(page.viewportSize().height);expect(b.height).toBeGreaterThanOrEqual(44);
 expect(await page.locator('.primary').evaluate(e=>{const b=e.getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('button')===e;})).toBe(true);return b;
};
const capture=async(page,name,info,fullPage=false)=>{mkdirSync(out,{recursive:true});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${out}/${name}-${info.project.name}.png`,fullPage});};
test.beforeEach(async({page})=>{
 const a={calls:[],external:[],errors:[]};activity.set(page,a);
 page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))a.calls.push({method:r.method(),path:u.pathname});if(!['localhost','127.0.0.1'].includes(u.hostname))a.external.push(r.url());});
 page.on('pageerror',e=>a.errors.push(e.message));
 await page.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
});
test.afterEach(async({page})=>{expect(activity.get(page).external).toEqual([]);expect(activity.get(page).errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);});

test('selected WebP hero, avatar and escape story: exact bytes, first-screen CTA, honest rights and keyboard disclosure',async({page,request},info)=>{
 await page.goto('/');const image=page.locator('.escape-art img');await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(e=>e.complete&&e.naturalWidth>0)).toBe(true);
 const expected=info.project.name==='1280'?'scout-hero-desktop.webp':'escape-hero-mobile.webp';expect(await image.evaluate(e=>new URL(e.currentSrc).pathname)).toBe('/consumer/unfarmd/'+expected);
 await expect(page.locator('.escape-art')).toContainText('Founder-selected art · rights review pending');await expect(page.locator('.launch-boundary')).toContainText('name/trademark clearance remain pending');
 const before=await action(page);expect(activity.get(page).calls).toEqual([]);await axe(page);await capture(page,'hero',info);
 await expect(page.locator('link[rel=icon][href="/consumer/unfarmd/scout-avatar.webp"]')).toHaveAttribute('href','/consumer/unfarmd/scout-avatar.webp');
 const manifest=JSON.parse(readFileSync('docs/unfarmd-consumer-v1/artwork/asset-manifest.json'));
 for(const name of Object.values(manifest.recommended)){const r=await request.get('/consumer/unfarmd/'+name);expect(r.status()).toBe(200);expect(r.headers()['content-type']).toContain('image/webp');expect(createHash('sha256').update(await r.body()).digest('hex')).toBe(manifest.derivatives[name].sha256);}
 const summary=page.locator('.trenchers > summary');await summary.focus();await page.keyboard.press('Enter');const story=page.locator('.trenchers img');await story.scrollIntoViewIfNeeded();await expect.poll(()=>story.evaluate(e=>e.naturalWidth)).toBe(1456);await expect(story).toHaveAttribute('width','1456');await expect(story).toHaveAttribute('height','816');await expect(page.locator('.trenchers')).toContainText('Commercial rights and trademark clearance pending');await axe(page);await capture(page,'story',info,true);
 await summary.focus();await page.keyboard.press('Escape');await expect(summary).toBeFocused();await expect(page.locator('.trenchers')).not.toHaveAttribute('open');expect(activity.get(page).calls).toEqual([]);
 writeFileSync(`${out}/receipt-${info.project.name}.json`,JSON.stringify({viewport:page.viewportSize(),build:'actual Next.js production',hero:expected,action:before,sourceRequests:0,axeViolations:0,rights:'pending; founder visual approval only',authenticHeliusObservation:false},null,2)+'\n');
});

test('slow image reserves CTA geometry and cannot steal address focus when decoding',async({page})=>{
 let release;const wait=new Promise(resolve=>release=resolve);await page.route('**/consumer/unfarmd/*hero*.webp',async r=>{await wait;await r.continue();});
 await page.goto('/',{waitUntil:'domcontentloaded'});const field=page.getByLabel('Token address',{exact:true});await field.fill(mint);await expect(field).toBeFocused();const before=await action(page);release();
 await expect.poll(()=>page.locator('.escape-art img').evaluate(e=>e.complete&&e.naturalWidth>0)).toBe(true);const after=await action(page);expect(Math.abs(after.y-before.y)).toBeLessThan(0.5);await expect(field).toBeFocused();expect(activity.get(page).calls).toEqual([]);
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Paste token address',exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'SCOUT IT',exact:true})).toBeFocused();
});

test('missing artwork retains alt text, usable CTA and actual source-denied keyboard recovery',async({page},info)=>{
 await page.route('**/consumer/unfarmd/*.webp',r=>r.abort());await page.goto('/');const image=page.locator('.escape-art img');await expect(image).toHaveAttribute('alt',/skeptical black sheep/);expect(await image.evaluate(e=>e.complete&&e.naturalWidth===0)).toBe(true);await action(page);await expect(page.locator('.escape-art')).toContainText('rights review pending');await axe(page);await capture(page,'image-failed',info);
 const summary=page.locator('.trenchers > summary');await summary.focus();await page.keyboard.press('Enter');const story=page.locator('.trenchers img');await story.scrollIntoViewIfNeeded();await expect(story).toHaveAttribute('alt',/farm animals past a broken fence/);await expect.poll(()=>story.evaluate(e=>e.complete&&e.naturalWidth===0)).toBe(true);await summary.focus();await page.keyboard.press('Escape');await expect(summary).toBeFocused();
 const field=page.getByLabel('Token address',{exact:true});await field.fill(mint);expect(activity.get(page).calls).toEqual([]);const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/mint-facts');await field.press('Enter');expect((await response).status()).toBe(403);await expect(page.locator('.brief-status')).toHaveText('Check not permitted');await expect(page.locator('.mint-supply,.mint-authorities,[data-attention=true]')).toHaveCount(0);await expect(page.locator('#brief-title')).toBeFocused();
 await field.click();await expect(field).toBeFocused();await expect(field).toHaveValue(mint);expect(activity.get(page).calls).toEqual([{method:'GET',path:'/api/mint-facts'}]);await axe(page);
});

test('reduced motion, forced colors and browser zoom keep art independent of input and research',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce',forcedColors:'active'});await page.goto('/');await page.evaluate(()=>document.documentElement.style.zoom='2');
 const field=page.getByLabel('Token address',{exact:true});await field.fill('SOL');await field.press('Enter');await expect(field).toHaveAttribute('aria-invalid','true');await expect(page.locator('#answer-title')).toBeFocused();for(let i=0;i<3;i++)await page.keyboard.press('Shift+Tab');await expect(field).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Paste token address',exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'SCOUT IT',exact:true})).toBeFocused();await expect(page.getByRole('button',{name:'SCOUT IT',exact:true})).toBeInViewport();expect(activity.get(page).calls).toEqual([]);
});
