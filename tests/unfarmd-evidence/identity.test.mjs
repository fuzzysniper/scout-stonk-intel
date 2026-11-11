import test from 'node:test';
import assert from 'node:assert/strict';
import {api,mint} from './fixtures.mjs';
const resolve=api.resolveAssetIdentity;
const sol=(extra={})=>({kind:'solana_mint',chain:'solana:mainnet',address:mint,...extra});
test('format-only key never verifies account existence or mint authority',()=>{
  const r=resolve(sol()); assert.equal(r.state,'exact_identifier'); assert.equal(r.verification,'not_verified'); assert.equal(r.inputOrigin,'user_entered'); assert.equal(r.asset.assetKey,`solana:mainnet:${mint}`);
});
test('case-sensitive Solana identity is preserved; a ticker label cannot change a mint',()=>{
  const address='So11111111111111111111111111111111111111112';
  const r=resolve(sol({address,ticker:'GOLD'})); assert.equal(r.asset.address,address); assert.notEqual(r.asset.assetKey,resolve(sol({address:address.toLowerCase()})).asset.assetKey);
  assert.deepEqual(resolve(sol({address,ticker:'NVDA'})).asset,r.asset);
});
test('Solana base58 must decode to exactly 32 bytes',()=>{for(const address of ['1'.repeat(31),'1'.repeat(33),'z'.repeat(44),'0'.repeat(32),'I'.repeat(32),'0x'+'a'.repeat(40)]) assert.equal(resolve(sol({address})).state,'invalid');});
test('different Solana clusters remain distinct',()=>{assert.notEqual(resolve(sol()).asset.assetKey,resolve(sol({chain:'solana:devnet'})).asset.assetKey);});
test('pasted Solana address whitespace is normalized before the canonical size bound',()=>{const r=resolve(sol({address:`  ${mint}                  `}));assert.equal(r.state,'exact_identifier');assert.equal(r.asset.address,mint);});
test('wrong chain hints fail closed',()=>{assert.equal(resolve(sol({chain:'eip155:1'})).state,'conflicting_hints');assert.equal(resolve(sol({chain:'SOL'})).state,'conflicting_hints');});
test('EVM requires explicit chain, canonicalizes address only, preserves entered casing',()=>{
  const enteredAddress='0x'+'Ab'.repeat(20); const r=resolve({kind:'evm_token',chain:'eip155:1',address:enteredAddress});
  assert.equal(r.state,'exact_identifier'); assert.equal(r.asset.enteredAddress,enteredAddress); assert.equal(r.asset.address,enteredAddress.toLowerCase()); assert.ok(r.reasons.includes('checksum_not_verified'));
  assert.notEqual(r.asset.assetKey,resolve({kind:'evm_token',chain:'eip155:8453',address:enteredAddress}).asset.assetKey);
});
test('EVM missing/zero/leading-zero/overlong or symbolic chain is not guessed',()=>{for(const chain of [undefined,'eip155:0','eip155:01','ethereum','eip155:9999999999999999']) assert.equal(resolve({kind:'evm_token',chain,address:'0x'+'a'.repeat(40)}).state,'conflicting_hints');});
test('no EVM account existence, contract or checksum assurance is inferred',()=>{const r=resolve({kind:'evm_token',chain:'eip155:1',address:'0x'+'0'.repeat(40)});assert.equal(r.verification,'not_verified');});
test('pasted EVM address whitespace is normalized without changing case evidence',()=>{const address='0x'+'Ab'.repeat(20);const r=resolve({kind:'evm_token',chain:'eip155:1',address:` ${address} `});assert.equal(r.state,'exact_identifier');assert.equal(r.asset.enteredAddress,address);});
test('invalid EVM address and wrong-chain Solana address rejected',()=>{for(const address of [mint,'0x'+'g'.repeat(40),'0x'+'a'.repeat(39),'0X'+'a'.repeat(40)])assert.equal(resolve({kind:'evm_token',chain:'eip155:1',address}).state,'invalid');});
test('ticker alone is ambiguous across all asset classes',()=>{for(const ticker of ['SOL','CARDS','NVDA','GOLD']){const r=resolve({kind:'unknown',ticker});assert.equal(r.state,'ambiguous');assert.equal(r.asset.assetKey,null);}});
test('equity listing requires MIC and is not a permanent instrument identity',()=>{
  assert.equal(resolve({kind:'listed_equity',ticker:'NVDA'}).state,'ambiguous');
  const r=resolve({kind:'listed_equity',mic:'XNAS',ticker:'nvda'}); assert.equal(r.asset.assetKey,'listed_equity:XNAS:NVDA'); assert.equal(r.asset.permanence,'listing_reference_not_permanent_security_id'); assert.equal(r.verification,'not_verified');
  assert.notEqual(r.asset.assetKey,resolve({kind:'listed_equity',mic:'XNYS',ticker:'NVDA'}).asset.assetKey);
});
test('token ticker is never mapped to equity ownership or quote asset',()=>{assert.notEqual(resolve(sol({ticker:'NVDA'})).asset.assetKey,resolve({kind:'listed_equity',mic:'XNAS',ticker:'NVDA'}).asset.assetKey);});
test('unsupported asset kinds stay unknown without echoed input',()=>{for(const kind of ['option','nft','forex','commodity','solana','__proto__']){const r=resolve({kind,address:'SECRET-DO-NOT-ECHO'});assert.equal(r.state,'unsupported');assert.ok(!JSON.stringify(r).includes('SECRET'));}});
test('invalid cross-asset fields cannot silently resolve',()=>{assert.equal(resolve(sol({mic:'XNAS'})).state,'conflicting_hints');assert.equal(resolve({kind:'listed_equity',mic:'XNAS',ticker:'NVDA',chain:'solana:mainnet'}).state,'conflicting_hints');assert.equal(resolve({kind:'unknown',ticker:'NVDA',address:mint}).state,'conflicting_hints');});
test('conflicting exact identity hints never merge or select a convenient ticker',()=>{assert.equal(resolve(sol({hints:[{kind:'listed_equity',mic:'XNAS',ticker:'NVDA'}]})).state,'conflicting_hints');assert.equal(resolve(sol({hints:[sol()]})).state,'exact_identifier');assert.equal(resolve(sol({hints:[sol({chain:'solana:devnet'})]})).state,'conflicting_hints');});
test('nested hints, malformed input and unknown fields have bounded failure',()=>{for(const value of [null,[],false,4,'SOL',sol({url:'https://example.invalid/?api-key=secret'}),sol({hints:[sol({hints:[]})]}),sol({hints:Array(9).fill(sol())})]) assert.notEqual(resolve(value).state,'exact_identifier');});
test('exact canonical keys reject noncanonical or ambiguous encodings',()=>{for(const value of ['SOL','eip155:01:0x'+'a'.repeat(40),'listed_equity:xnas:nvda',`solana:unknown:${mint}`])assert.equal(api.isAssetKey(value),false);assert.equal(api.isAssetKey(`solana:mainnet:${mint}`),true);});
test('deterministic malformed-identity fuzz never fabricates coverage or throws',()=>{
  let seed=184;const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  for(let i=0;i<1000;i++){const value=String.fromCharCode(...Array.from({length:next()%80},()=>next()%128));const r=resolve(sol({address:value}));assert.notEqual(r.state,'exact_identifier');assert.equal(r.verification,'not_verified');}
});
