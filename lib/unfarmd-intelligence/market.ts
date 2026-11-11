import {decodeObservation} from '../trader-pulse/decoder';
import {LIMITS} from '../trader-pulse/contract';
import type {Acquisition, FactCard, FactValue, SourceEvidence, SourceProjection} from './contract';
import {admit,asset,hash,time,receiptFields} from './internal';
import {sourceFailure} from './source-off';

/** Pure receipt projection reuses Pulse's bounded original-byte decoder. No I/O.
 * Does NOT consume the lossy /api/token result or relabel that legacy endpoint. */
export function projectMarketReceipt(input: {
  mint: string; quoteMint?: string; bytes: Uint8Array; requestStartedMs: number;
  fetchedMs: number; evaluatedMs: number; acquisition: Acquisition;
}): SourceProjection {
  receiptFields(input,['mint','bytes','requestStartedMs','fetchedMs','evaluatedMs','acquisition'],['quoteMint']);
  const identity=asset(input.mint);time(input.evaluatedMs);
  if (!['synthetic_fixture','recorded_response'].includes(input.acquisition)) throw Error('invalid_acquisition');
  try {
    const s=decodeObservation({mint:identity.mint,quoteMint:input.quoteMint,bytes:input.bytes,requestStartedMs:input.requestStartedMs,retrievedMs:input.fetchedMs});
    if (input.evaluatedMs < input.fetchedMs) throw Error('future_receipt');
    const p=s.selectedPool;
    if (!p) return sourceFailure('dexscreener',identity.mint,'no_eligible_base_pool');
    if (p.pairCreatedAt !== null && p.pairCreatedAt > input.fetchedMs) throw Error('future_pool');
    const stale=input.evaluatedMs-input.fetchedMs>LIMITS.retrievalMaxAgeMs;
    const baseEvidence={asset:identity,provider:'dexscreener' as const,acquisition:input.acquisition,
      originVerification:'capture_origin_not_independently_attested' as const,
      assurance:'provider_report_not_onchain_verified' as const,endpoint:s.source.endpoint,evidenceUrl:p.sourceUrl,
      responseSha256:s.source.responseSha256,requestStartedAt:s.source.clock.requestStartedAt,fetchedAt:s.source.clock.retrievedAt,
      observedAt:null,observationTime:'unknown' as const,contextSlot:null,commitment:null};
    const evidence:SourceEvidence={id:'evidence:'+hash(baseEvidence),...baseEvidence,retrievalFreshness:stale?'stale':'recent'};
    const card=(id:FactCard['id'],value:FactValue|null):FactCard=>({id,provider:'dexscreener',
      state:stale||value===null?'unknown':'observed',fact:stale?null:value,
      assessment:{color:'grey',rule:'reported_pool_context_v1',reason:stale?'stale_receipt':value===null?'field_not_provided':'market_observation_time_unknown'},evidenceRef:evidence.id});
    return admit({version:'unfarmd-source-projection/1',asset:identity,provider:'dexscreener',evidence,
      pool:{address:p.pairAddress,baseMint:p.base.mint,quoteMint:p.quote.mint,dexId:p.dexId,
        selection:'highest_reported_liquidity_in_bounded_eligible_base_sample_then_ascii_pool',returnedPools:s.scope.returned,complete:false,requestedQuoteMint:s.requestedQuoteMint},
      facts:[card('pool_liquidity_usd',p.liquidityUsd===null?null:{kind:'usd_amount',amount:p.liquidityUsd}),
        card('pool_volume_24h_usd',p.volumeUsd.h24===null?null:{kind:'usd_amount',amount:p.volumeUsd.h24}),
        card('pool_age_at_fetch',p.pairCreatedAt===null?null:{kind:'pool_age_at_fetch',reportedCreatedAt:time(p.pairCreatedAt),seconds:Math.floor((input.fetchedMs-p.pairCreatedAt)/1000)}),
        card('base_price_usd',p.priceUsd===null?null:{kind:'usd_price',decimal:p.priceUsd}),
        card('base_change_24h_percent',p.priceChangePercent.h24===null?null:{kind:'percent',amount:p.priceChangePercent.h24})]});
  } catch {return sourceFailure('dexscreener',identity.mint,'invalid_response');}
}
