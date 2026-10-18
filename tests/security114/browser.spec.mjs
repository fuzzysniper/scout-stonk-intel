import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import sharp from 'sharp';
test('real Next HTTP optimizer: benign AVIF/PNG succeed; SVG and remote URLs are refused',async({request})=>{
 const base=process.env.SCOUT_SECURITY_IMAGE_PATH;
 if(!base?.startsWith('/__security114.'))throw Error('Use tests/security114/run-browser.sh for generated local fixtures');
 const image=name=>'/_next/image?url='+encodeURIComponent(base+'/'+name)+'&w=64&q=75';
 for(const name of ['benign.avif','benign.png']){
  const r=await request.get(image(name),{headers:{Accept:'image/webp'}});
  expect(r.status(),name).toBe(200);expect(r.headers()['content-type']).toBe('image/webp');
  const m=await sharp(await r.body()).metadata();expect(m.width).toBe(8);expect(m.height).toBe(8);
 }
 const svg=await request.get(image('benign.svg'));expect(svg.status()).toBe(400);
 expect(await svg.text()).toContain('image type is not allowed');
 const malformed=await request.get(image('not-an-image.png'));expect(malformed.status()).toBe(400);
 const remote=await request.get('/_next/image?url='+encodeURIComponent('https://example.invalid/test.avif')+'&w=64&q=75');
 expect(remote.status()).toBe(400);expect(await remote.text()).toContain('not allowed');
});
test('consumer and terminal OG still render genuine 1200×630 PNGs',async({request})=>{
 for(const url of ['/opengraph-image','/terminal/opengraph-image']){
  const r=await request.get(url);expect(r.status()).toBe(200);
  const m=await sharp(await r.body()).metadata();expect(m.format).toBe('png');expect(m.width).toBe(1200);expect(m.height).toBe(630);
 }
 const unavailable=await request.get('/api/og?mint=So11111111111111111111111111111111111111112');
 expect(unavailable.status()).toBe(503);expect(unavailable.headers()['cache-control']).toBe('no-store');
 expect(unavailable.headers()['retry-after']).toBe('60');expect(await unavailable.text()).toBe('Social preview temporarily unavailable');
 const extraImage=await request.get('/api/og?mint=So11111111111111111111111111111111111111112&image=https://example.invalid/test.svg');
 expect(extraImage.status()).toBe(400);
});
test('terminal search remains keyboard-safe and honest when live registry access is blocked',async({page},info)=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/terminal');
 const search=page.getByRole('combobox',{name:'Search quote assets'});
 await expect(search).toBeVisible();await search.focus();await search.fill('NVDAX');
 await expect(page.getByText('Registry search unavailable. No identities verified.')).toBeVisible();
 await page.keyboard.press('Escape');await expect(search).toBeFocused();await expect(search).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('.pair-token')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 expect(errors).toEqual([]);
 await page.screenshot({path:`docs/consumer-v15-ux/screenshots/security114-terminal-offline-${info.project.name}.png`});
});
