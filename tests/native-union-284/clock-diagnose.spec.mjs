// FINITE controlled diagnosis, not a substitute for the original57-case PG acceptance.
import {test,expect} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import {MINT} from '../oracle-holders-260/fixtures.mjs';import {clockProbe} from './clock-probe.mjs';
const take=p=>p.locator('[data-oracle-take]'),lead=p=>take(p).locator('[data-take-part="take"]>summary>strong');
for(const mode of ['original-1','original-2','original-3','lag-negative','aligned-1','aligned-2','aligned-3'])test('SYNTHETIC ACTUAL PG clock '+mode,async({page},info)=>{
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const probe=clockProbe(page,info),first=Date.now();
 try{
  await page.clock.install({time:new Date(first-(mode==='lag-negative'?1250:0))});
  await page.request.get('/__mode?mode=warning');await page.goto('/lens');await probe.install({synchronize:mode.startsWith('aligned')});
  await page.getByLabel('Solana token address · CA').fill(MINT);await page.getByRole('button',{name:'INSPECT',exact:true}).click();await expect(page.getByRole('heading',{name:'Native evidence',exact:true})).toBeFocused();
  const initial=await probe.snapshot('initial');expect(initial.http.at(-1).httpStatus).toBe(200);expect(initial.evidenceState).toBe('candidate');expect(initial.schemaValid).toBe(true);expect(initial.storageKind).toBe('actual-postgres-18');expect(initial.counts.reads).toBe(3);
  if(mode.startsWith('aligned')){expect(initial.synchronization.eligible).toBe(true);expect(initial.synchronization.bodyChanged).toBe(false);expect(initial.synchronization.forwardedBodySha256).toBe(initial.http.at(-1).bodySha256);}
  if(mode==='lag-negative'){
   // Negative control only. The original expiry success assertion below remains RED.
   expect(initial.classification).toBe('future_dated_at_handling');await expect(take(page).locator('[data-take-part="take"]')).toHaveAttribute('data-tone','gray');expect(initial.atHost.tone).toBe('red');
   await page.clock.setSystemTime(new Date(Date.now()));await probe.snapshot('negative-after-wall-clock-resync');await expect(take(page).locator('[data-take-part="take"]')).toHaveAttribute('data-tone','gray');return;
  }
  await expect(take(page).locator('[data-take-part="take"]')).toHaveAttribute('data-tone','red');
  await take(page).locator('[data-take-part="take"]>summary').focus();await page.clock.fastForward(60001);await expect(lead(page)).toHaveText('No defensible thesis established.');await expect(take(page).locator('[data-take-part="take"]>summary')).toBeFocused();await take(page).locator('[data-take-part="take"]>summary').click();await expect(take(page)).toContainText('Historical or incomplete candidate');
  await probe.snapshot('expired');await page.clock.setSystemTime(new Date(first+10000));await expect(lead(page)).toHaveText('No defensible thesis established.');const last=await probe.snapshot('rollback');expect(last.counts.reads).toBe(3);expect(last.counts.state.attempts).toBe(3);expect(last.counts.inspections).toBe(1);
 }finally{await probe.finish();}
});
