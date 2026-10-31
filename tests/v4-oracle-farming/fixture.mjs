// Entirely invented offline records. No captured wallet, transaction or provider response.
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function b58(bytes){let n=0n;for(const b of bytes)n=n*256n+BigInt(b);let s='';while(n){s=alphabet[Number(n%58n)]+s;n/=58n;}for(const b of bytes){if(b!==0)break;s='1'+s;}return s;}
export const key=n=>b58(Uint8Array.from({length:32},(_,i)=>(n+i)%256));
export const sig=n=>b58(Uint8Array.from({length:64},(_,i)=>(n+i)%256));
export const MINT=key(1),QUOTE=key(2),ASOF='2026-10-31T12:00:10.000Z';
export const time=s=>new Date(Date.parse('2026-10-31T11:00:00.000Z')+s*1000).toISOString();
export function evidence(sourceAt=time(3600),contextSlot=200){return {provider:'solana_rpc',captureKind:'synthetic_fixture',network:'solana-mainnet-beta',commitment:'finalized',responseSha256:'a'.repeat(64),fieldPath:'$.result.value',clockKind:'finalized_block_time',clockResponseSha256:'d'.repeat(64),clockFieldPath:'$.result',sourceAt,receivedAt:ASOF,contextSlot,rights:{analysis:'approved_private',reviewSha256:'b'.repeat(64)}};}
export function tx(n,second=3500,slot=190){return {signature:sig(n),instructionIndex:0,status:'succeeded',slot,blockTime:time(second),evidence:evidence()};}
export function observation(data){return {mint:MINT,evidence:evidence(),window:{from:time(0),to:time(3600),firstSlot:100,lastSlot:200,status:'complete'},data};}
export function input(){return {mint:MINT,asOf:ASOF};}
export function holders(){const o=observation({supplyRaw:'10000',decimals:6,snapshotSlot:200,population:'all_token_accounts',accounts:Array.from({length:100},(_,i)=>({account:key(i+20),mint:MINT,owner:null,amountRaw:'100'})),exclusions:[]});o.window.from=o.window.to;o.window.firstSlot=200;return o;}
export function funding(){return observation({trackedWallets:[key(10),key(11)],edges:[{...tx(1),from:key(12),to:key(10),lamports:'1000000'},{...tx(2,3520),from:key(12),to:key(11),lamports:'1'}]});}
export function trade(n,wallet,side='buy',second=3500){return {...tx(n,second),pool:key(40),mint:MINT,quoteMint:QUOTE,wallet,side,baseRaw:'100',quoteRaw:'2000000'};}
export function cohorts(){return observation({baseDecimals:6,quoteMint:QUOTE,quoteDecimals:6,pools:[key(40)],splitAt:time(1800),trades:[trade(1,key(10),'buy',1000),trade(2,key(10)),trade(3,key(10)),trade(4,key(11)),trade(5,key(11),'sell')]});}
export function exits(){return observation({baseDecimals:6,cohortCutoff:time(-10),wallets:[{wallet:key(10),firstObservedBuy:trade(8,key(10),'buy',-20),openingRaw:'1000',closingRaw:'400',openingEvidence:evidence(time(0),100),closingEvidence:evidence()}],events:[{...tx(9),mint:MINT,wallet:key(10),kind:'sell',baseRaw:'600'}]});}
export function liquidity(){return observation({pool:key(40),quoteMint:QUOTE,baseDecimals:6,quoteDecimals:6,openingBaseRaw:'1000',closingBaseRaw:'600',openingQuoteRaw:'2000',closingQuoteRaw:'1200',openingEvidence:evidence(time(0),100),closingEvidence:evidence(),events:[{...tx(20),pool:key(40),mint:MINT,quoteMint:QUOTE,kind:'remove',recipient:key(50),baseRaw:'400',quoteRaw:'800',migration:null}]});}
// Early anchor genuinely predates the opening slot.
const originalExits=exits;
export function full(){const e=originalExits();e.data.wallets[0].firstObservedBuy.slot=90;return {...input(),holders:holders(),funding:funding(),cohorts:cohorts(),exits:e,liquidity:liquidity()};}
