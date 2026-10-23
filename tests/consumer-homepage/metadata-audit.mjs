/** QA readout of actual emitted metadata, not simulated browser/OS chrome. */
import {mkdirSync} from 'node:fs';
export async function captureMetadataAudit(page,home,history,path){
 const escape=s=>String(s??'Not emitted').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const icon=home.icons.find(x=>x.rel==='icon'),apple=home.icons.find(x=>x.rel==='apple-touch-icon');
 const meta=(route,name)=>route.metas.find(x=>x.name===name)?.content;
 const image=icon?`<img src="${escape(new URL(icon.href,page.url()).href)}" width="16" height="16" alt="Emitted favicon at 16 pixels"><img src="${escape(new URL(icon.href,page.url()).href)}" width="32" height="32" alt="Emitted favicon at 32 pixels">`:'Not emitted';
 const touch=apple?`<img src="${escape(new URL(apple.href,page.url()).href)}" width="180" height="180" alt="Emitted Apple icon at 180 pixels">`:'No apple-touch-icon link emitted on homepage';
 await page.setContent(`<!doctype html><html lang="en"><title>Actual HTTP metadata audit</title><style>body{background:#191e18;color:#e8e0cd;font:16px/1.5 Arial;padding:30px;margin:0}h1{font-size:28px}h2{font-size:18px}section{border-top:1px solid #555f48;padding:18px 0}code{overflow-wrap:anywhere;font-size:13px}p{max-width:800px}.icons{display:flex;align-items:center;gap:24px;min-height:50px}.note{color:#cbb9a1;font-size:13px}</style><h1>UNFARMD · emitted metadata audit</h1><p class="note">Read from the optimized Next.js response. This is a QA readout, not browser chrome or an iOS preview.</p><section><h2>Homepage favicon · native 16 / 32px</h2><div class="icons">${image}</div><code>${escape(icon?.href)}</code></section><section><h2>Homepage Apple icon · native 180px</h2>${touch}<p><code>${escape(apple?.href)}</code></p></section><section><h2>Historical Research</h2><p>Page title: ${escape(history.title)}</p><p>Open Graph: ${escape(meta(history,'og:title'))}</p><p>Twitter: ${escape(meta(history,'twitter:title'))}</p><p>${escape(meta(history,'og:description'))}</p></section><p class="note">Rights pending. No source activation. No authentic Helius observation.</p></html>`);
 await page.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
 mkdirSync(path.slice(0,path.lastIndexOf('/')),{recursive:true});
 await page.screenshot({path,fullPage:true});
}
export async function emittedMetadata(page){
 return page.evaluate(()=>({title:document.title,canonical:document.querySelector('link[rel=canonical]')?.href,
  icons:[...document.querySelectorAll('link[rel*=icon]')].map(x=>({rel:x.rel,href:x.getAttribute('href'),type:x.type,sizes:x.sizes.value})),
  metas:[...document.querySelectorAll('meta[property^="og:"],meta[name^="twitter:"],meta[name="robots"],meta[name="description"]')].map(x=>({name:x.getAttribute('property')||x.name,content:x.content}))}));
}
