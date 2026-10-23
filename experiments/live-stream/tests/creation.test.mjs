import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,notice,corroborate,AT,ack,d,MINT} from './fixtures.mjs';

test('creation hint is provisional, with exact provider signature/slot but no invented mint',()=>{
  assert.equal(notice(ack,AT,null).kind,'ack');const f=fixture(),row=notice(f.raw,AT,9).row;
  assert.equal(row.mint,null);assert.equal(row.quoteMint,null);assert.equal(row.finality,'provisional');assert.equal(row.sourceClockVerified,false);
  const final=corroborate(row,JSON.stringify(f.tx),JSON.stringify(f.status),AT);
  assert.equal(final.mint,MINT);assert.equal(final.quoteMint,d.ZERO);assert.equal(final.tokenProgram,d.TOKEN2022);
  assert.equal(final.verification,'rpc_reported_finalized_same_provider');assert.match(final.transactionHash,/^[a-f0-9]{64}$/);
  assert.ok(!('price' in final)&&!('holderSafety' in final)&&!('volume' in final));
});
for(const hint of ['Migrate','Buy','Sell','BuyV3'])test(`${hint} is ignored, not discovered or sampled`,()=>{assert.equal(notice(fixture({hint}).raw,AT,9).kind,'ignored');});
for(const [name,edit] of [
  ['signature',f=>f.tx.result.transaction.signatures[0]=fixture({seed:2}).signature],
  ['slot',f=>f.tx.result.slot++],['status slot',f=>f.status.result.value[0].slot++],
  ['not finalized',f=>f.status.result.value[0].confirmationStatus='confirmed'],
  ['transaction failure',f=>f.tx.result.meta.err={InstructionError:[0,'Custom']}],
  ['RPC error',f=>f.tx.error={code:429,message:'SYNTHETIC'}],
  ['wrong event authority',f=>f.tx.result.meta.innerInstructions[0].instructions[0].accounts=[0]],
  ['routed CPI',f=>f.tx.result.meta.innerInstructions[0].instructions[0].stackHeight=3],
])test(`corroboration withholds ${name}`,()=>{const f=fixture(),row=notice(f.raw,AT,9).row;edit(f);assert.throws(()=>corroborate(row,JSON.stringify(f.tx),JSON.stringify(f.status),AT));});
test('exact quote identity: USDC supported, WSOL cannot silently replace native SOL, others withheld',()=>{
  const u=fixture({quote:d.USDC});assert.equal(corroborate(notice(u.raw,AT,9).row,JSON.stringify(u.tx),JSON.stringify(u.status),AT).quoteMint,d.USDC);
  const other=fixture({quote:MINT});assert.throws(()=>corroborate(notice(other.raw,AT,9).row,JSON.stringify(other.tx),JSON.stringify(other.status),AT));
});
test('old/future source clocks and malformed/unbound/duplicate-key frames fail closed',()=>{
  const f=fixture(),row=notice(f.raw,AT,9).row;
  assert.throws(()=>corroborate({...row,receivedAt:'2026-10-22T12:10:10Z'},JSON.stringify(f.tx),JSON.stringify(f.status),'2026-10-22T12:10:10Z'));
  assert.throws(()=>corroborate({...row,receivedAt:'2026-10-22T11:59:59Z'},JSON.stringify(f.tx),JSON.stringify(f.status),AT));
  for(const [raw,sub] of [[f.raw,null],[f.raw,8],['{"jsonrpc":"2.0","id":1,"id":1,"result":9}',null],['x',9]])assert.throws(()=>notice(raw,AT,sub));
});
