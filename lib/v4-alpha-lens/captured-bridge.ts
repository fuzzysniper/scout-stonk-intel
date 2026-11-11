import 'server-only';
import {projectHeliusCapture as projectA} from '../v4-solana-facts';
import {unavailable} from '../v4-solana-facts/projection';
import type {HeliusCapture,SolanaFactProjectionV1} from '../v4-solana-facts/contract';
import {isExactPublicKey,utcMicros} from '../onchain-mint/validation';
import {projectHeliusCapture as projectB,projectMarketReceipt,joinEvidence,sourceFailure} from '../unfarmd-intelligence';
import type {IntelligenceSnapshot,FailureReason} from '../unfarmd-intelligence/contract';
import {receiptFields,time,deepFreeze} from '../unfarmd-intelligence/internal';
export type CapturedAssembly=Readonly<{
  version:'unfarmd-lens-captured/1';sourceGo:false;
  state:'offline_captured'|'unavailable';onchain:SolanaFactProjectionV1;intelligence:IntelligenceSnapshot;
}>;
type MarketReceipt=Parameters<typeof projectMarketReceipt>[0];
function captured(value:unknown):value is HeliusCapture {
  try{
    receiptFields(value,['kind','request','requestStartedAt','responseReceivedAt','evaluatedAt','httpStatus','text'],['httpDate']);
    const c=value as Record<string,unknown>;
    receiptFields(c.request,['network','endpointHost','method','encoding','commitment','mint','id']);
    const r=c.request as Record<string,unknown>;
    return (c.kind==='synthetic_fixture'||c.kind==='recorded_response')&&
      r.network==='solana-mainnet'&&r.endpointHost==='mainnet.helius-rpc.com'&&r.method==='getAccountInfo'&&r.encoding==='jsonParsed'&&r.commitment==='finalized'&&
      isExactPublicKey(r.mint)&&Number.isSafeInteger(r.id)&&Number(r.id)>0&&
      Number.isInteger(c.httpStatus)&&Number(c.httpStatus)>=100&&Number(c.httpStatus)<=599&&typeof c.text==='string'&&Buffer.byteLength(c.text)<=65536&&
      ['requestStartedAt','responseReceivedAt','evaluatedAt'].every(k=>typeof c[k]==='string')&&
      (c.httpDate===undefined||c.httpDate===null||typeof c.httpDate==='string');
  }catch{return false;}
}
/** Offline ONLY. A and B consume the SAME copied original receipt, never a cast
 * serialized A projection. Not imported by /lens or any API/source runtime. */
export async function assembleCapturedEvidence(mint:string,input:{rpc?:unknown;market?:MarketReceipt},evaluatedMs:number):Promise<CapturedAssembly>{
  if(!isExactPublicKey(mint))throw Error('invalid_exact_solana_mint');
  time(evaluatedMs);
  const empty=(onchain:SolanaFactProjectionV1,reason:FailureReason):CapturedAssembly=>deepFreeze({
    version:'unfarmd-lens-captured/1',sourceGo:false,state:'unavailable',onchain,
    intelligence:joinEvidence(mint,[sourceFailure('helius-solana-rpc',mint,reason),sourceFailure('dexscreener',mint,reason)],evaluatedMs)});
  try{
    receiptFields(input,[],['rpc','market']);
    if(!captured(input.rpc)||!input.market)return empty(unavailable(mint,'invalid_capture'),'invalid_response');
    const c=deepFreeze({...input.rpc,request:{...input.rpc.request}});
    // Copy bytes/config BEFORE the async call; caller mutation cannot swap mint/source.
    receiptFields(input.market,['mint','bytes','requestStartedMs','fetchedMs','evaluatedMs','acquisition'],['quoteMint']);
    if(!(input.market.bytes instanceof Uint8Array))return empty(unavailable(mint,'invalid_capture'),'invalid_response');
    const market={...input.market,evaluatedMs,bytes:Uint8Array.from(input.market.bytes)};
    if(c.request.mint!==mint||market.mint!==mint)return empty(unavailable(mint,'invalid_capture'),'invalid_response');
    const a=await projectA(mint,c);
    if(!a.provenance||!a.observations)return empty(a,a.reason==='stale_source'?'stale_source':'invalid_response');
    const fetched=utcMicros(a.provenance.responseReceivedAt),now=BigInt(evaluatedMs)*1000n;
    if(fetched===null||fetched>now)return empty(unavailable(mint,'invalid_clock'),'invalid_clock');
    if(now-fetched>60000000n)return empty(unavailable(mint,'stale_source','unknown'),'stale_source');
    const b=await projectB({mint,requestId:c.request.id,text:c.text,requestStartedAt:c.requestStartedAt,responseReceivedAt:c.responseReceivedAt,
      evaluatedAt:c.evaluatedAt,httpDate:c.httpDate,captureKind:c.kind});
    const m=projectMarketReceipt(market);
    if(!b.evidence||!m.evidence||m.evidence.retrievalFreshness==='stale'||
      b.evidence.responseSha256!==a.provenance.responseSha256||b.evidence.contextSlot!==a.provenance.contextSlot||
      b.evidence.fetchedAt!==a.provenance.responseReceivedAt||b.evidence.acquisition!==a.provenance.captureKind||
      a.sourceGo!==false||a.provenance.providerAuthentication!=='not_verified_offline')return empty(unavailable(mint,'invalid_response'),'invalid_response');
    const intelligence=joinEvidence(mint,[b,m],evaluatedMs);
    if(intelligence.sources.some(s=>s.retrievalFreshness==='stale'))return empty(unavailable(mint,'stale_source','unknown'),'stale_source');
    return deepFreeze({version:'unfarmd-lens-captured/1',sourceGo:false,state:'offline_captured',onchain:a,intelligence});
  }catch{return empty(unavailable(mint,'invalid_response'),'invalid_response');}
}
