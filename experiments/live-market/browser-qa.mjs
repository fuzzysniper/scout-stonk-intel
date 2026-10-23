import {chromium} from '../consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs';
const url=process.env.PRIVATE_VIEW_URL;
if(!url||!/^http:\/\/127\.0\.0\.1:\d+$/.test(url))throw Error('EXPLICIT_LOCAL_VIEW_ONLY');
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const results=[];
try{for(const width of [320,390,1280]){
 const page=await browser.newPage({viewport:{width,height:844}});let external=0,sockets=0;const errors=[];
 await page.route('**/*',r=>{if(!r.request().url().startsWith(url+'/')){external++;return r.abort();}return r.continue();});
 page.on('websocket',()=>sockets++);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.getByText('NOT_RUN · SOURCE_DISABLED_APPROVAL_REQUIRED',{exact:true}).waitFor();await page.waitForTimeout(1100);
 const r={width,noOverflow:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),notRunMetrics:await page.getByText('NOT RUN',{exact:true}).count(),providerRequests:external,websockets:sockets,errors};
 await page.locator('summary').focus();await page.keyboard.press('Enter');r.keyboardDisclosure=await page.locator('details').evaluate(d=>d.open);
 if(width===390)await page.screenshot({path:new URL('./docs/private-disabled-390.png',import.meta.url).pathname,fullPage:true});
 results.push(r);await page.close();
}}finally{await browser.close();}
fs.writeFileSync(new URL('./docs/browser-qa.json',import.meta.url),JSON.stringify({notice:'Actual local view command, SOURCE_DISABLED. No live acquisition or physical-device/human test.',results},null,2)+'\n');
if(results.some(r=>!r.noOverflow||r.notRunMetrics!==4||!r.keyboardDisclosure||r.providerRequests||r.websockets||r.errors.length))process.exitCode=1;
console.log(JSON.stringify(results));
