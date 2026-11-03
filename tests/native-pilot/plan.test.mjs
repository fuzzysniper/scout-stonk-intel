import test from 'node:test';import assert from 'node:assert/strict';
import {load,debit,policy,MINT} from './fixtures.mjs';import {key} from '../oracle-holders-260/fixtures.mjs';
const {plan,policy:qualify,LIMITS}=load('plan');
for(let count=1;count<=4;count++)test(`finite ${count}-mint estimate counts all three calls per mint, never one credit per look-up`,()=>{
 const p=plan(Array.from({length:count},(_,n)=>key(n+1)),{...debit(),getMultipleAccounts:2});assert.equal(p.attempts,count*3);assert.equal(p.credits,count*4);assert.equal(p.dispatchable,false);assert.equal(LIMITS.attempts,3);assert.equal(LIMITS.sessionMs,900000);
});
for(const mints of [[],[MINT,MINT],['USDC'],[' '+MINT],Array.from({length:5},(_,n)=>key(n+1))])test('reject invalid/duplicate/oversized exact mint plan '+JSON.stringify(mints),()=>assert.throws(()=>plan(mints,debit())));
for(const d of [null,{...debit(),getBlockTime:0},{...debit(),getMultipleAccounts:1.1},{...debit(),reviewSha256:'0'.repeat(64)},{...debit(),sendTransaction:1}])test('missing/unreviewed/invalid debit record is not a free call '+JSON.stringify(d),()=>assert.throws(()=>plan([MINT],d)));
for(const patch of [{credits:1},{expiresAt:policy().startsAt+900001},{origin:'https://unfarmd.com'},{origin:'https://scout-stonk-intel-git-foo-riskledgerapp.vercel.app'},{project:'other'},{branch:'main'},{retention:'none'},{mint:'USDC'},{keySha256:'0'.repeat(64)}])test('policy refuses widened or unbound scope '+JSON.stringify(patch),()=>assert.throws(()=>qualify({...policy(),...patch})));
test('approved public data policy is frozen, not an owner session, source grant or dispatch permission',()=>{const p=qualify(policy());assert.equal(Object.isFrozen(p.debit),true);assert.equal(plan([MINT],p.debit).dispatchable,false);});
