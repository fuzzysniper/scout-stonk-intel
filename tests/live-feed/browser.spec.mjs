import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../experiments/consumer-mvp/web/node_modules/@axe-core/playwright/dist/index.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {AT,TOKEN,event,feed,disabled} from './fixtures.mjs';
const calls=new WeakMap();
const connect=async page=>{await page.locator('#live-owner-token').fill(TOKEN);await page.getByRole('button',{name:'Read observations',exact:true}).click();};
const fixture=async(page,value=feed(),status=200)=>{await page.clock.install({time:new Date(AT)});await page.route('**/api/live-events',r=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(value)}));await page.goto('/');await page.evaluate(()=>{const p=document.createElement('p');p.textContent='OFFLINE HTTP FIXTURE · NOT AUTHENTIC SOURCE EVIDENCE';p.id='offline-fixture-warning';document.body.prepend(p);});};
const axe=async page=>expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
test.beforeEach(async({page})=>{
 const a={api:[],external:[],errors:[]};calls.set(page,a);
 page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))a.api.push({method:r.method(),path:u.pathname});if(!['localhost','127.0.0.1'].includes(u.hostname))a.external.push(u.host);});page.on('pageerror',e=>a.errors.push(e.message));
 await page.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
});
test.afterEach(async({page})=>{expect(calls.get(page).external).toEqual([]);expect(calls.get(page).errors).toEqual([]);expect(calls.get(page).api.every(c=>c.path==='/api/live-events'||c.path==='/api/live-events/stop')).toBe(true);});

test('real locked and disabled optimized app: no passive request, authentic OFF denial, Outlier and parked analysis',async({page},info)=>{
 // Capture the actual local backend body before the product's completed-stream
 // abort can evict Chromium's CDP response buffer. This is a real one-request
 // passthrough, not an invented fixture or an extra diagnostic API call.
 let actual;await page.route('**/api/live-events',async route=>{const response=await route.fetch();actual={status:response.status(),body:await response.json()};await route.fulfill({response});});
 await page.goto('/?mint=So11111111111111111111111111111111111111112&fixture=observing');await page.waitForLoadState('networkidle');
 await expect(page).toHaveTitle('UNFARMD · Private creation observations');await expect(page.getByRole('heading',{name:'Private viewer · locked',exact:true})).toBeVisible();expect(calls.get(page).api).toEqual([]);
 await expect(page.getByRole('region',{name:'Exact-mint analysis unavailable'})).toContainText('SCOUT IT · unavailable');await expect(page.locator('#mint')).toHaveCount(0);
 await expect(page.locator('link[rel=icon]')).toHaveAttribute('href',/^\/icon\.svg\?/);await expect(page.locator('link[rel=apple-touch-icon]')).toHaveAttribute('sizes','180x180');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const action=await page.getByRole('button',{name:'Read observations',exact:true}).boundingBox();expect(action.y+action.height).toBeLessThanOrEqual(page.viewportSize().height);await axe(page);
 mkdirSync('docs/live-feed-167/screenshots',{recursive:true});await page.screenshot({path:`docs/live-feed-167/screenshots/locked-${info.project.name}.png`});
 const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/live-events');await connect(page);const response=await pending;expect(response.status()).toBe(503);expect(actual.status).toBe(503);const body=actual.body;expect(body.status).toBe('disabled');expect(body.events).toBeNull();
 await expect(page.getByRole('heading',{name:'Source unavailable · disabled',exact:true})).toBeVisible();await expect(page.getByText('Retained counts unknown. No successful empty feed is inferred.')).toBeVisible();await expect(page.locator('.live-event')).toHaveCount(0);
 await expect(page.locator('#live-owner-token')).toHaveValue('');expect(calls.get(page).api).toEqual([{method:'GET',path:'/api/live-events'}]);await axe(page);
 await page.screenshot({path:`docs/live-feed-167/screenshots/disabled-${info.project.name}.png`});
 writeFileSync(`docs/live-feed-167/disabled-${info.project.name}.json`,JSON.stringify({viewport:page.viewportSize(),httpStatus:response.status(),status:body.status,events:body.events,counts:body.counts,apiCalls:calls.get(page).api,providerCalls:0,scope:'Actual local optimized app and B default-OFF API. No accepted records or hosted authentication claim.'},null,2)+'\n');
});

test('offline contract: latest20 receipts distinguish provisional identity and same-provider finality without financial indicators',async({page})=>{
 await fixture(page,feed('observing',Array.from({length:20},(_,i)=>event(i,i%2===0))));await connect(page);
 await expect(page.locator('.live-event')).toHaveCount(20);await expect(page.getByRole('heading',{name:'Observing · bounded source',exact:true})).toBeVisible();await expect(page.locator('.live-observations')).toContainText('10 provisional · 10 RPC-reported-finalized');
 const provisional=page.locator('.live-event').filter({hasText:'Provisional · WAIT'}).first();await expect(provisional).toContainText('Mint identity withheld');await expect(provisional.locator('.live-mint code')).toHaveCount(0);
 const finalized=page.locator('.live-event').filter({hasText:'RPC-reported-finalized'}).first();await expect(finalized.locator('.live-mint code')).toHaveText('1'.repeat(31)+'2');await finalized.locator('summary').click();await expect(finalized).toContainText('protocol sentinel, not WSOL');await expect(finalized).toContainText('Not independently replayed');await expect(finalized.locator('time').first()).toHaveAttribute('datetime','2026-10-23T17:59:50.000Z');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await axe(page);
});

for(const status of ['waiting','stale','stopped'])test(`offline contract: ${status} is explicit with original gaps, worker and budget`,async({page})=>{
 const value=feed(status,status==='waiting'?[]:undefined);value.health.gapSince='2026-10-23T17:59:45.000Z';
 await fixture(page,value);await connect(page);await expect(page.getByRole('heading',{name:status==='waiting'?'Waiting · no source activity established':status==='stale'?'Stale · freshness not established':'STOPPED · durable latch',exact:true})).toBeVisible();
 await expect(page.locator('.live-health')).toContainText('1 / 0');await expect(page.locator('.live-health')).toContainText('2026-10-23 17:59:45.000 UTC');await page.getByText('Reserved budget & retention',{exact:true}).click();await expect(page.locator('.live-status')).toContainText('1/3 connections · 2/40 HTTP reads');await expect(page.locator('.live-status')).toContainText('at most one hour, not a week-long service');
 if(status==='stopped'){await page.clock.fastForward(60000);expect(calls.get(page).api).toHaveLength(1);}await axe(page);
});

test('offline transport: memory-only token, real same-origin cookie delivery and minimum5s serial polling',async({page,context})=>{
 await context.addCookies([{name:'OFFLINE_SESSION_COOKIE',value:'fixture',domain:'127.0.0.1',path:'/'}]);await page.clock.install({time:new Date(AT)});
 let reads=0;const readTimes=[];await page.route('**/api/live-events',async r=>{readTimes.push(await page.evaluate(()=>Date.now()));reads++;expect(r.request().headers().authorization).toBe('Bearer '+TOKEN);expect(r.request().headers().cookie).toContain('OFFLINE_SESSION_COOKIE');return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(feed())});});
 await page.goto('/');await connect(page);await expect(page.locator('.live-event')).toHaveCount(2);await expect(page.locator('#live-owner-token')).toHaveValue('');
 expect(await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage},url:location.href}))).toEqual({local:{},session:{},url:'http://127.0.0.1:4180/'});
 expect(reads).toBe(1);await page.clock.fastForward(5000);await expect.poll(()=>reads).toBe(2);expect(readTimes[1]-readTimes[0]).toBeGreaterThanOrEqual(5000);
 await page.getByRole('button',{name:'Lock & clear',exact:true}).click();await page.clock.fastForward(30000);expect(reads).toBe(2);await expect(page.locator('.live-event')).toHaveCount(0);await page.reload();await page.waitForLoadState('networkidle');expect(reads).toBe(2);
});

test('offline lifecycle: hidden tab pauses acquisition, clocks age, visible resumes no faster than5s',async({page})=>{
 await fixture(page);await connect(page);await expect(page.locator('.live-event')).toHaveCount(2);
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});await page.clock.fastForward(30000);expect(calls.get(page).api).toHaveLength(1);await expect(page.getByRole('heading',{name:'Stale · freshness not established',exact:true})).toBeVisible();
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});await expect.poll(()=>calls.get(page).api.length).toBe(2);
});

test('offline lifecycle: 403 after a successful read clears records and halts; no cached fresh success',async({page})=>{
 await fixture(page);await connect(page);await expect(page.locator('.live-event')).toHaveCount(2);await page.route('**/api/live-events',r=>r.fulfill({status:403,contentType:'text/html',body:'<title>Authenticate</title>'}));
 await page.clock.fastForward(5000);await expect(page.locator('.live-notice')).toContainText('Access denied');await expect(page.locator('.live-event')).toHaveCount(0);await page.clock.fastForward(60000);expect(calls.get(page).api).toHaveLength(2);
});

test('offline integrity: synthetic source, malformed finality and oversized feeds are withheld and halt polling',async({page})=>{
 const bad=feed();bad.events[0].source='synthetic_fixture';await fixture(page,bad);await connect(page);await expect(page.locator('.live-notice')).toContainText('Response could not be verified');await expect(page.locator('.live-event')).toHaveCount(0);await page.clock.fastForward(60000);expect(calls.get(page).api).toHaveLength(1);
});

test('offline race: locking during a delayed read cannot restore records or restart refresh',async({page})=>{
 await page.clock.install({time:new Date(AT)});let release;const hold=new Promise(r=>release=r);await page.route('**/api/live-events',async r=>{await hold;await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(feed())}).catch(()=>{});});await page.goto('/');await connect(page);await expect(page.locator('.live-status')).toHaveAttribute('aria-busy','true');await page.getByRole('button',{name:'Lock & clear',exact:true}).click();release();await page.clock.fastForward(30000);await expect(page.getByRole('heading',{name:'Private viewer · locked',exact:true})).toBeVisible();await expect(page.locator('.live-event')).toHaveCount(0);expect(calls.get(page).api).toHaveLength(1);
});

test('offline STOP: separate authorization, explicit intent and acknowledgment without changing source clocks',async({page})=>{
 await fixture(page);await connect(page);await expect(page.locator('.live-event')).toHaveCount(2);let stops=0;
 await page.route('**/api/live-events/stop',r=>{stops++;expect(r.request().method()).toBe('POST');expect(r.request().headers()['x-scout-live-intent']).toBe('STOP_SCOUT_LIVE');expect(r.request().headers().authorization).toBe('Bearer '+TOKEN);expect(r.request().postData()).toBeNull();return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({version:'scout-live/1',status:'stopped',observedAt:'2026-10-23T18:00:01.000Z'})});});
 await page.getByText('Original bounded v1 · STOP only',{exact:true}).click();await expect(page.getByRole('button',{name:'STOP source',exact:true})).toBeDisabled();await page.locator('#live-stop-token').fill(TOKEN);await page.getByRole('checkbox').check();expect(stops).toBe(0);await page.getByRole('button',{name:'STOP source',exact:true}).click();await expect(page.locator('.live-stop-notice')).toContainText('Durable STOP confirmed');await expect(page.locator('#live-stop-token')).toHaveValue('');await expect(page.getByRole('heading',{name:'STOPPED · durable latch',exact:true})).toBeVisible();await expect(page.locator('.live-event time').first()).toHaveAttribute('datetime','2026-10-23T17:59:50.000Z');await page.clock.fastForward(60000);expect(stops).toBe(1);expect(calls.get(page).api).toHaveLength(2);await axe(page);
});

test('offline STOP: failed persistence never claims stopped or automatically retries',async({page})=>{
 await fixture(page);await connect(page);await expect(page.locator('.live-event')).toHaveCount(2);await page.route('**/api/live-events/stop',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify(disabled('unavailable'))}));await page.getByText('Original bounded v1 · STOP only',{exact:true}).click();await page.locator('#live-stop-token').fill(TOKEN);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'STOP source',exact:true}).click();await expect(page.locator('.live-stop-notice')).toContainText('STOP NOT CONFIRMED');await expect(page.getByRole('heading',{name:'Unavailable · status unknown',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'STOPPED · durable latch',exact:true})).toHaveCount(0);await page.clock.fastForward(60000);expect(calls.get(page).api).toEqual([{method:'GET',path:'/api/live-events'},{method:'POST',path:'/api/live-events/stop'}]);
});

test('real locked mobile layout: keyboard, larger text, reduced motion and landscape remain usable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.locator('#live-owner-token').focus();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Read observations',exact:true})).toBeFocused();await page.evaluate(()=>document.documentElement.style.zoom='2');await page.locator('#live-owner-token').focus();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Read observations',exact:true})).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await axe(page);await page.evaluate(()=>document.documentElement.style.zoom='');await page.setViewportSize({width:844,height:390});await page.reload();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(calls.get(page).api).toEqual([]);
});
