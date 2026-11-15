// Fixed synthetic classifications; never turns a withheld state into a successful reading.
import test from 'node:test';import assert from 'node:assert/strict';import {classifyClock} from '../native-union-284/clock-probe.mjs';
const valid={status:200,readError:null,schemaValid:true,handledAt:1000,evaluatedAt:999,deadline:60999,pureTone:'red',displayedTone:'red',abortName:undefined};
test('instrumentation separates future, expired, acquisition denial, timeout and rendering mismatch',()=>{
 assert.equal(classifyClock(valid),'current_red');
 for(const [patch,label]of [[{handledAt:998,displayedTone:'gray'},'future_dated_at_handling'],[{handledAt:60999,displayedTone:'gray'},'expired_at_handling'],[{status:503,handledAt:null},'acquisition_denial'],[{status:401,handledAt:null},'acquisition_denial'],[{status:undefined,handledAt:null,abortName:'TimeoutError'},'acquisition_timeout'],[{status:undefined,handledAt:null,abortName:'AbortError'},'missing_or_incomplete_response'],[{readError:'unreadable'},'missing_or_incomplete_response'],[{schemaValid:false},'invalid_evidence'],[{handledAt:null},'handling_sample_unavailable'],[{displayedTone:'gray'},'rendering_or_later_withdrawal']])assert.equal(classifyClock({...valid,...patch}),label);
});
