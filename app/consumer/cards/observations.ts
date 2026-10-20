/** Consumer-safe eligibility metadata. No monetary values or source-attestation shortcut. */
import type {PairToken} from '../../../lib/pairs-contract';
export const OBSERVATION_POLICY='cards-normalized-24h-v1' as const;
export type ObservationBlocker='actual_market_time_missing'|'quote_price_history_missing'|'original_decimal_lexemes_missing'|'market_cap_definition_missing'|'source_rights_unverified'|'market_source_unavailable';
export const blockerText:Record<ObservationBlocker,string>={
 actual_market_time_missing:'Actual market observation times are missing; response dates are not price times.',
 quote_price_history_missing:'No aligned CARDS-denominated price history is supplied.',
 original_decimal_lexemes_missing:'This API projection does not retain the original numeric source text.',
 market_cap_definition_missing:'Market cap, its supply definition and its observation time are absent from this contract.',
 source_rights_unverified:'Publication and retention permissions are unverified, independently of data quality.',
 market_source_unavailable:'No usable market snapshot is supplied for this token.',
};
export type SnapshotEligibility={
 state:'insufficient_data';observedPricePoints:0;readyForComparison:false;
 reported:{price:boolean;liquidity:boolean;volume:boolean};unit:'USD';actualMarketAt:null;
 reasons:ObservationBlocker[];
};
export function snapshotEligibility(market:PairToken['market']):SnapshotEligibility {
 const available=market.status==='reported_snapshot';
 return {state:'insufficient_data',observedPricePoints:0,readyForComparison:false,
  reported:{price:available&&market.priceUsd!==null,liquidity:available&&market.liquidityUsd!==null,volume:available&&market.volume24hUsd!==null},unit:'USD',actualMarketAt:null,
  reasons:[...(!available?['market_source_unavailable' as const]:[]),'actual_market_time_missing','quote_price_history_missing','original_decimal_lexemes_missing','market_cap_definition_missing','source_rights_unverified']};
}
export function summarizeEligibility(rows:readonly SnapshotEligibility[]){
 return {policy:OBSERVATION_POLICY,windowHours:24 as const,requiredActualPoints:25 as const,sampleCount:rows.length,
  comparableCount:0 as const,actualPricePoints:0 as const,priceSnapshotCount:rows.filter(r=>r.reported.price).length,
  liquiditySnapshotCount:rows.filter(r=>r.reported.liquidity).length,volumeSnapshotCount:rows.filter(r=>r.reported.volume).length,
  ranking:'withheld' as const,rights:'unverified' as const,reason:'no_qualified_timestamped_quote_price_history' as const};
}
