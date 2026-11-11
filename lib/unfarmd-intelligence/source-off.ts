import type {FailureReason,FactId,Provider,SourceProjection} from './contract';
import {admit,asset} from './internal';
const ids:Readonly<Record<Provider,readonly FactId[]>>={
  dexscreener:['pool_liquidity_usd','pool_volume_24h_usd','pool_age_at_fetch','base_price_usd','base_change_24h_percent'],
  'helius-solana-rpc':['mint_authority','freeze_authority','program','supply'],
};
const reasons:readonly FailureReason[]=['disabled','rate_limited','timeout','upstream_unavailable','invalid_response','invalid_clock','stale_source','no_eligible_base_pool','unsupported'];
export function sourceFailure(provider:Provider,mint:string,reason:FailureReason):SourceProjection {
  const identity=asset(mint);
  if (!Object.hasOwn(ids,provider)||!reasons.includes(reason)) throw Error('invalid_source_failure');
  return admit({version:'unfarmd-source-projection/1',asset:identity,provider,evidence:null,pool:null,
    facts:ids[provider].map(id=>({id,provider,state:reason==='disabled'||reason==='stale_source'?'unknown':reason==='unsupported'?'unsupported':'unavailable',fact:null,
      assessment:{color:'grey',rule:'source_unavailable_v1',reason},evidenceRef:null}))});
}
