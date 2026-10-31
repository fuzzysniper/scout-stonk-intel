import {createRequire} from 'node:module';import path from 'node:path';import test from 'node:test';import assert from 'node:assert/strict';
import {input,full,key,time,tx,evidence,MINT,QUOTE} from './fixture.mjs';
const {analyzeFarmEvidence:analyze}=createRequire(import.meta.url)(path.join(process.env.FARM_BUILD,'lib/v4-oracle/farming/index.js'));
const keys={holders:'concentration',funding:'funding',cohorts:'cohorts',exits:'exits',liquidity:'liquidity'};
function gray(a,k){const f=a.findings.find(f=>f.id==='farming-'+k);assert.equal(f.tone,'gray');assert.equal(f.value,null);assert.equal(f.responseSha256,null);}
for(const field of Object.keys(keys))for(const [label,mutate] of [
 ['wrong exact mint',o=>{o.mint=key(99);}],
 ['partial coverage',o=>{o.window.status='partial';}],
 ['unavailable coverage',o=>{o.window.status='unavailable';}],
 ['stale source',o=>{o.evidence.sourceAt=time(3400);}],
 ['future source',o=>{o.evidence.sourceAt=time(3700);}],
 ['future receipt',o=>{o.evidence.receivedAt=time(3700);}],
 ['receipt before source',o=>{o.evidence.receivedAt=time(3500);}],
 ['missing original source time',o=>{delete o.evidence.sourceAt;}],
 ['unfinalized',o=>{o.evidence.commitment='confirmed';}],
 ['missing independent clock hash',o=>{delete o.evidence.clockResponseSha256;}],
 ['missing original clock path',o=>{o.evidence.clockFieldPath=null;}],
 ['unknown clock semantics',o=>{o.evidence.clockKind='last_trade';}],
 ['wrong chain',o=>{o.evidence.network='solana-devnet';}],
 ['Jupiter heuristic is not onchain farm evidence',o=>{o.evidence.provider='jupiter';}],
 ['missing hash',o=>{o.evidence.responseSha256=null;}],
 ['invalid hash',o=>{o.evidence.responseSha256='A'.repeat(64);}],
 ['missing path',o=>{o.evidence.fieldPath=null;}],
 ['URL/secret instead of path',o=>{o.evidence.fieldPath='https://SECRET.example/?key=never';}],
 ['unreviewed rights',o=>{o.evidence.rights.analysis='unreviewed';}],
 ['restricted rights',o=>{o.evidence.rights.analysis='restricted';}],
 ['missing rights receipt',o=>{o.evidence.rights.reviewSha256=null;}],
 ['invalid context slot',o=>{o.evidence.contextSlot=1.5;}],
 ['context before window end',o=>{o.evidence.contextSlot=199;}],
 ['invalid absolute source date',o=>{o.evidence.sourceAt='2026-02-31T12:00:00.000Z';}],
 ['snapshot/window after source',o=>{o.window.to=time(3601);}],
 ['missing source as-of window',o=>{o.window.to=null;}],
 ['slot range reversed',o=>{o.window.firstSlot=201;}],
 ['unbounded time range',o=>{o.window.from='2020-01-01T00:00:00.000Z';}]
])test(`${field}: ${label} fails gray`,()=>{const i=full();mutate(i[field]);gray(analyze(i),keys[field]);});
for(const [label,value]of [['negative','-1'],['fraction','0.5'],['exponent','1e6'],['float',1.5],['leading zero','01'],['uint64 overflow','18446744073709551616'],['huge','9'.repeat(1000)]])test(`integer amounts reject ${label}`,()=>{const i=full();i.holders.data.accounts[0].amountRaw=value;gray(analyze(i),'concentration');});
for(const [label,change]of [
 ['duplicate account',i=>{i.holders.data.accounts.push(i.holders.data.accounts[0]);}],
 ['wrong account mint',i=>{i.holders.data.accounts[0].mint=QUOTE;}],
 ['unreconciled full supply',i=>{i.holders.data.supplyRaw='10001';}],
 ['zero supply',i=>{i.holders.data.supplyRaw='0';}],
 ['overcounted supply',i=>{i.holders.data.supplyRaw='9999';}],
 ['unverified exclusion',i=>{i.holders.data.exclusions=[{account:i.holders.data.accounts[0].account,kind:'cex',evidence:null}];}],
 ['classification from older slot',i=>{i.holders.data.exclusions=[{account:i.holders.data.accounts[0].account,kind:'pool',evidence:evidence(time(3600),199)}];}],
 ['stale exclusion',i=>{i.holders.data.exclusions=[{account:i.holders.data.accounts[0].account,kind:'platform',evidence:evidence(time(3400))}];}],
 ['unknown excluded address',i=>{i.holders.data.exclusions=[{account:key(7),kind:'pool',evidence:evidence()}];}],
 ['duplicated exclusions',i=>{i.holders.data.exclusions=Array.from({length:2},()=>({account:i.holders.data.accounts[0].account,kind:'pool',evidence:evidence()}));}],
 ['mixed fixture exclusion',i=>{const e=evidence();e.captureKind='native_https';i.holders.data.exclusions=[{account:i.holders.data.accounts[0].account,kind:'pool',evidence:e}];}],
 ['missing account list',i=>{i.holders.data.accounts=null;}]
])test(`holder rejection: ${label}`,()=>{const i=full();change(i);gray(analyze(i),'concentration');});
for(const [field,recordKey]of [['funding','edges'],['cohorts','trades'],['exits','events'],['liquidity','events']])for(const [label,change]of [
 ['duplicate signature/instruction',list=>{list.push(structuredClone(list[0]));}],
 ['invalid signature bytes',list=>{list[0].signature='1'.repeat(65);}],
 ['failed transaction',list=>{list[0].status='failed';}],
 ['unknown transaction outcome',list=>{delete list[0].status;}],
 ['invalid instruction',list=>{list[0].instructionIndex=-1;}],
 ['transaction slot outside interval',list=>{list[0].slot=99;}],
 ['transaction slot beyond evidence',list=>{list[0].evidence.contextSlot=189;}],
 ['transaction outside time',list=>{list[0].blockTime=time(-1);}],
 ['transaction after source clock',list=>{list[0].evidence.sourceAt=new Date(Date.parse(list[0].blockTime)-1).toISOString();}],
 ['rights-restricted edge',list=>{list[0].evidence.rights.analysis='restricted';}],
 ['mixed fixtures mislabeled native',list=>{list[0].evidence.captureKind='native_https';}],
 ['no transaction evidence',list=>{delete list[0].evidence;}]
])test(`${field} transaction rejection: ${label}`,()=>{const i=full();change(i[field].data[recordKey]);gray(analyze(i),keys[field]);});
for(const [label,change]of [
 ['same mint used as quote',i=>{i.cohorts.data.quoteMint=MINT;}],
 ['trade outside declared pool set',i=>{i.cohorts.data.trades[0].pool=key(41);}],
 ['missing venue coverage domain',i=>{delete i.cohorts.data.pools;}],
 ['trade mint mismatch',i=>{i.cohorts.data.trades[0].mint=QUOTE;}],
 ['trade quote mismatch',i=>{i.cohorts.data.trades[0].quoteMint=key(7);}],
 ['trade side not decoded',i=>{i.cohorts.data.trades[0].side='swap';}],
 ['unknown base amount',i=>{i.cohorts.data.trades[0].baseRaw=null;}],
 ['zero quote consideration',i=>{i.cohorts.data.trades[0].quoteRaw='0';}],
 ['empty baseline',i=>{i.cohorts.data.splitAt=i.cohorts.window.from;}],
 ['empty current window',i=>{i.cohorts.data.splitAt=i.cohorts.window.to;}]
])test(`cohort rejection: ${label}`,()=>{const i=full();change(i);gray(analyze(i),'cohorts');});
for(const [label,change]of [
 ['not actually observed early',i=>{i.exits.data.wallets[0].firstObservedBuy.blockTime=time(1);}],
 ['anchor is sell not buy',i=>{i.exits.data.wallets[0].firstObservedBuy.side='sell';}],
 ['anchor wallet mismatch',i=>{i.exits.data.wallets[0].firstObservedBuy.wallet=key(11);}],
 ['anchor mint mismatch',i=>{i.exits.data.wallets[0].firstObservedBuy.mint=QUOTE;}],
 ['missing opening snapshot',i=>{i.exits.data.wallets[0].openingEvidence=null;}],
 ['wrong opening snapshot boundary',i=>{i.exits.data.wallets[0].openingEvidence.sourceAt=time(1);}],
 ['wrong closing snapshot boundary',i=>{i.exits.data.wallets[0].closingEvidence.contextSlot=199;}],
 ['untracked wallet event',i=>{i.exits.data.events[0].wallet=key(11);}],
 ['wrong event mint',i=>{i.exits.data.events[0].mint=QUOTE;}],
 ['unknown flow type',i=>{i.exits.data.events[0].kind='claim';}],
 ['closing balance mismatch',i=>{i.exits.data.wallets[0].closingRaw='401';}],
 ['duplicate early wallet',i=>{i.exits.data.wallets.push(structuredClone(i.exits.data.wallets[0]));}]
])test(`exits rejection: ${label}`,()=>{const i=full();change(i);gray(analyze(i),'exits');});
for(const [label,change]of [
 ['wrong pool event',i=>{i.liquidity.data.events[0].pool=key(41);}],
 ['wrong quote event',i=>{i.liquidity.data.events[0].quoteMint=key(41);}],
 ['wrong base event',i=>{i.liquidity.data.events[0].mint=QUOTE;}],
 ['capability not execution',i=>{i.liquidity.data.events[0].kind='can_remove';}],
 ['no pool snapshots',i=>{i.liquidity.data.openingEvidence=null;}],
 ['wrong pool opening slot',i=>{i.liquidity.data.openingEvidence.contextSlot=101;}],
 ['no reliable events',i=>{i.liquidity.data.events=null;}],
 ['circular migration',i=>{i.liquidity.data.events[0].migration={destinationPool:i.liquidity.data.pool,evidence:evidence()};}],
 ['unproven migration',i=>{i.liquidity.data.events[0].migration={destinationPool:key(41),evidence:null};}],
 ['migration predates removal',i=>{i.liquidity.data.events[0].migration={destinationPool:key(41),evidence:evidence(time(3400))};}],
 ['fee is not migration',i=>{i.liquidity.data.events[0].kind='fee';i.liquidity.data.events[0].migration={destinationPool:key(41),evidence:evidence()};}]
])test(`pool rejection: ${label}`,()=>{const i=full();change(i);gray(analyze(i),'liquidity');});
for(const [label,mutate]of [
 ['not an object',()=>null],['unknown root fields',i=>({...i,organicScore:100,priceChange:-99})],['wrong mint syntax',i=>({...i,mint:'USDC'})],['whitespace mint',i=>({...i,mint:' '+MINT})],['invalid as-of',i=>({...i,asOf:'today'})],['mixed base units',i=>{i.exits.data.baseDecimals=9;return i;}],['mixed quote units',i=>{i.liquidity.data.quoteDecimals=9;return i;}],['cycle',i=>{i.cohorts=i;return i;}],['exotic object',()=>new Date()],['oversized string',i=>({...i,mint:'x'.repeat(1025)})],['too many records',i=>{i.funding.data.edges=Array.from({length:513},()=>tx(1));return i;}],['sparse array',i=>{i.funding.data.edges=new Array(2);return i;}],['non JSON BigInt',i=>({...i,asOf:0n})],['deep nesting',i=>{let d={};i.funding=d;for(let n=0;n<20;n++){d.child={};d=d.child;}return i;}]
])test(`global input rejects ${label}`,()=>{const a=analyze(mutate(full()));assert.ok(a.findings.every(f=>f.tone==='gray'));});
test('getters never run and cannot supply credentials or mutate acquisition',()=>{let called=0;const i=input();Object.defineProperty(i,'holders',{enumerable:true,get(){called++;throw new Error('SECRET');}});const a=analyze(i);assert.equal(called,0);assert.ok(a.findings.every(f=>f.tone==='gray'));assert.ok(!JSON.stringify(a).includes('SECRET'));});
test('invalid area cannot hide a valid independent red removal',()=>{const i=full();i.funding.evidence.rights.analysis='restricted';const a=analyze(i);gray(a,'funding');assert.equal(a.findings.find(f=>f.id==='farming-liquidity').tone,'red');});
test('stale, partial and rights hold have categorical reasons without leaking input',()=>{for(const [mutation,reason]of [[o=>{o.evidence.sourceAt=time(3400);},'stale_source'],[o=>{o.window.status='partial';},'incomplete_coverage'],[o=>{o.evidence.rights.analysis='restricted';},'rights_hold']]){const i=full();mutation(i.funding);const a=analyze(i);assert.equal(a.details.funding.reason,reason);}});

for(const field of ['exits','liquidity'])test(`${field}: opening snapshot slot cannot be counted again as an interval event`,()=>{const i=full();i[field].data.events[0].slot=100;gray(analyze(i),field);});
