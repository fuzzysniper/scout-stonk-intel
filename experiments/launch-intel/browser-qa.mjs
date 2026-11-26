// Reuses the existing local browser QA toolchain. No install or source acquisition.
import {chromium} from '../consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const results=[];
try{for(const width of [320,390,1280]){
 const page=await browser.newPage({viewport:{width,height:844}});let external=0;
 await page.route(/^https?:/,route=>{external++;return route.abort();});
 // file:// navigation is disabled by this environment; render local static bytes directly.
 await page.setContent(readFileSync(new URL('./docs/private-brief.html',import.meta.url),'utf8'));
 const result={width,synthetic:await page.getByText('SYNTHETIC OFFLINE EXAMPLE',{exact:true}).isVisible(),wait:await page.getByText('WAIT · RESEARCH ONLY',{exact:true}).isVisible(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)};
 await page.getByText('Receipts & invalidation conditions',{exact:true}).focus();await page.keyboard.press('Enter');
 result.disclosure=await page.locator('details').evaluate(d=>d.open);
 await page.keyboard.press('Tab');result.keyboardLink=await page.locator('a').evaluate(a=>a===document.activeElement);result.externalRequests=external;
 if(width===390)await page.screenshot({path:new URL('./docs/mobile-synthetic-390.png',import.meta.url).pathname,fullPage:true});
 results.push(result);await page.close();
}}finally{await browser.close();}
writeFileSync(new URL('./docs/browser-qa.json',import.meta.url),JSON.stringify({notice:'Local static SYNTHETIC OFFLINE brief via setContent; no production/physical-device/human test.',browser:'Chromium',results},null,2)+'\n');
if(results.some(r=>r.overflow||!r.synthetic||!r.wait||!r.disclosure||!r.keyboardLink||r.externalRequests))process.exitCode=1;
console.log(JSON.stringify(results));
