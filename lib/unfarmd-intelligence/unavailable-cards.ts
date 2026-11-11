/** Client-safe absence only. No receipt admission, source I/O, values or enable option. */
import type {FailureReason,FactCard,FactId,Provider} from './contract';
const ids:Readonly<Record<Provider,readonly FactId[]>>={
  dexscreener:['pool_liquidity_usd','pool_volume_24h_usd','pool_age_at_fetch','base_price_usd','base_change_24h_percent'],
  'helius-solana-rpc':['mint_authority','freeze_authority','program','supply'],
};
const reasons:readonly FailureReason[]=['disabled','rate_limited','timeout','upstream_unavailable','invalid_response','invalid_clock','stale_source','no_eligible_base_pool','unsupported'];
export function unavailableCards(provider:Provider,reason:FailureReason):readonly FactCard[]{
  if(!Object.hasOwn(ids,provider)||!reasons.includes(reason))throw Error('invalid_source_failure');
  return Object.freeze(ids[provider].map((id):FactCard=>Object.freeze({id,provider,
    state:reason==='disabled'||reason==='stale_source'?'unknown':reason==='unsupported'?'unsupported':'unavailable',fact:null,
    assessment:Object.freeze({color:'grey',rule:'source_unavailable_v1',reason}),evidenceRef:null})));
}
