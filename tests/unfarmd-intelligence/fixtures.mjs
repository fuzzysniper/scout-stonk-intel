// SYNTHETIC OFFLINE ONLY. Public addresses are identifiers, NOT source captures.
// All figures/clocks/text below are invented format/security fixtures.
import {createRequire} from 'node:module';
import {envelope,MINT,OTHER,THIRD,token2022} from '../../lib/onchain-mint/tests/fixtures.mjs';
export {MINT,OTHER,THIRD,token2022};
const require=createRequire(import.meta.url),build=process.env.INTELLIGENCE_BUILD;
export const api=require(build+'/lib/unfarmd-intelligence/index.js');
export const {createPrivateResearchAdapter}=require(build+'/lib/trader-pulse/adapter.js');
export const {hash}=require(build+'/lib/unfarmd-intelligence/internal.js');
export const NOW=Date.parse('2026-10-28T12:00:00.000Z');
export const pair=(changes={})=>({chainId:'solana',dexId:'synthetic-dex',pairAddress:THIRD,
 baseToken:{address:MINT,name:'SYNTHETIC OFFLINE',symbol:'TEST'},quoteToken:{address:OTHER,name:'SYNTHETIC QUOTE',symbol:'TEST'},
 liquidity:{usd:5000},volume:{h24:200},priceUsd:'0.000000012345678901234567',priceChange:{h24:-12.5},pairCreatedAt:NOW-3600000,...changes});
export function market(options={}){
 const {pools=[pair()],bytes=new TextEncoder().encode(JSON.stringify(pools)),...rest}=options;
 return api.projectMarketReceipt({mint:MINT,bytes,requestStartedMs:NOW-20,fetchedMs:NOW,evaluatedMs:NOW,acquisition:'synthetic_fixture',...rest});
}
export function capture(options={}){
 const {body=envelope(),...rest}=options;
 return {mint:MINT,requestId:body.id,text:JSON.stringify(body),requestStartedAt:new Date(NOW-20).toISOString(),responseReceivedAt:new Date(NOW).toISOString(),evaluatedAt:new Date(NOW).toISOString(),captureKind:'synthetic_fixture',...rest};
}
export const SCOPE={ownerScope:'12345678-1234-4234-8234-123456789abc',journalId:'87654321-4321-4321-8321-cba987654321',asset:{chain:'solana',mint:MINT}};
export const NOTE={kind:'created',content:{thesis:'SYNTHETIC OWNER CLAIM — hypothesis, not a verified fact.',invalidation:null,contradictions:null},fact_snapshot_refs:[]};
export function append(entries=[],change=NOTE,options={}){
 const {recorded_at=new Date(NOW+entries.length*1000).toISOString(),expectedHead=entries.at(-1)?.hash??null,nowMs=NOW+100000,scope=SCOPE}=options;
 return api.appendThesis(entries,{scope,change,recorded_at},expectedHead,nowMs);
}
export const copy=x=>JSON.parse(JSON.stringify(x));
export function rehash(e){const body={...e};delete body.hash;e.hash=hash(body);return e;}
