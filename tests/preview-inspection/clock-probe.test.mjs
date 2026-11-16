// Fixed synthetic classifications; never turns a withheld state into a successful reading.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {classifyClock,deliveryClock} from '../native-union-284/clock-probe.mjs';
const valid={status:200,readError:null,schemaValid:true,handledAt:1000,evaluatedAt:999,deadline:60999,pureTone:'red',displayedTone:'red',abortName:undefined};
test('instrumentation separates future, expired, acquisition denial, timeout and rendering mismatch',()=>{
 assert.equal(classifyClock(valid),'current_red');
 for(const [patch,label]of [[{handledAt:998,displayedTone:'gray'},'future_dated_at_handling'],[{handledAt:60999,displayedTone:'gray'},'expired_at_handling'],[{status:503,handledAt:null},'acquisition_denial'],[{status:401,handledAt:null},'acquisition_denial'],[{status:undefined,handledAt:null,abortName:'TimeoutError'},'acquisition_timeout'],[{status:undefined,handledAt:null,abortName:'AbortError'},'missing_or_incomplete_response'],[{readError:'unreadable'},'missing_or_incomplete_response'],[{schemaValid:false},'invalid_evidence'],[{handledAt:null},'handling_sample_unavailable'],[{displayedTone:'gray'},'rendering_or_later_withdrawal']])assert.equal(classifyClock({...valid,...patch}),label);
});
test('later expiry and retained rollback are distinguished from initial rendering synchronization',()=>{
 assert.equal(classifyClock({...valid,observedAt:61000,displayedTone:'gray'}),'expired_after_handling');
 assert.equal(classifyClock({...valid,observedAt:5000,previouslyExpired:true,displayedTone:'gray'}),'withdrawal_retained_after_rollback');
});
test('test-clock alignment refuses stale, future, denied, malformed or uncertain evidence; original receipt lifetime is unchanged',()=>{
 const now=Date.UTC(2030,0,1),e={state:'candidate',origin:{label:'SYNTHETIC OFFLINE'},evaluatedAt:new Date(now).toISOString(),references:[{receivedAt:new Date(now-100).toISOString()}]};
 const before=JSON.stringify(e),p=deliveryClock(e,200,now);assert.equal(p.eligible,true);assert.equal(p.deadline,now-100+60000);assert.equal(JSON.stringify(e),before);assert.equal(p.bodyChanged,false);
 for(const [value,status,time]of [[e,503,now],[e,401,now],[{...e,evaluatedAt:new Date(now+1).toISOString()},200,now],[e,200,now+60000],[e,200,NaN],[{...e,references:[]},200,now],[{...e,references:'bad'},200,now],[{...e,references:[{receivedAt:'invalid'}]},200,now],[null,200,now],[{...e,state:'unavailable'},200,now]])assert.equal(deliveryClock(value,status,time).eligible,false);
});
test('the original clock-test assertions and acquisition path remain, with no new sleeps, retries, relaxed lifespan or runtime change',()=>{
 const file='tests/native-union-284/browser.spec.mjs',old=execFileSync('git',['show','6e7cbda0e5392839bf8890a67786703021004b3b:'+file]).toString(),now=fs.readFileSync(file,'utf8'),normalize=s=>s.replace(/\s+/g,'');
 const title="test('LOCAL/SYNTHETIC expiry and clock rollback withdraw the real-pipeline conclusion without refetch or lost focus'",block=s=>s.slice(s.indexOf(title),s.indexOf("for(const mode of ['sample','stop-ack-lost'"));
 const expected=["await expect(take(page).locator('[data-take-part=\"take\"]')).toHaveAttribute('data-tone','red')","await take(page).locator('[data-take-part=\"take\"]>summary').focus()","await page.clock.fastForward(60001)","await expect(lead(page)).toHaveText('No defensible thesis established.')","await expect(take(page).locator('[data-take-part=\"take\"]>summary')).toBeFocused()","await take(page).locator('[data-take-part=\"take\"]>summary').click()","await expect(take(page)).toContainText('Historical or incomplete candidate')","await page.clock.setSystemTime(new Date(first+10000))","await expect(lead(page)).toHaveText('No defensible thesis established.')","expect((await counts(page)).reads).toBe(3)"];
 for(const text of [block(old),block(now)]){let at=0;const n=normalize(text);for(const assertion of expected){const next=n.indexOf(normalize(assertion),at);assert.ok(next>=at,assertion);at=next+normalize(assertion).length;}}
 assert.doesNotMatch(block(now),/waitForTimeout|setTimeout|\.retry|\.skip/);assert.doesNotMatch(block(now).split('await page.clock.fastForward(60001)')[0],/data-tone','gray'/);assert.match(block(now),/synchronize:true/);
 for(const p of ['app/lens/native-lens.tsx','app/lens/native-take.ts','app/lens/native-evidence-model.ts','tests/native-union-284/session.mjs','tests/native-union-284/pg18-context.mjs','tests/native-union-284/pg18-cases.mjs'])assert.deepEqual(fs.readFileSync(p),execFileSync('git',['show','6e7cbda0e5392839bf8890a67786703021004b3b:'+p]),p);
});
