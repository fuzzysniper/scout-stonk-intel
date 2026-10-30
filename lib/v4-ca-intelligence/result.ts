import 'server-only';
import { freeze, isExactPublicKey } from '../onchain-mint/validation';
import type { MintFactsV1 } from '../onchain-mint/contract';
import type { CaIntelligenceV1, Concern, MarketEvidence, UnknownReason } from './contract';
import { emptyMarket } from './market';
const UNKNOWNS = ['holder_concentration_and_insider_attribution','liquidity_control_lp_locks_and_exit_capacity','issuer_legitimacy_backing_and_ownership','market_windows_exact_boundaries_and_coverage','momentum_persistence_and_future_returns'] as const;
export function assemble(mint: unknown, market: MarketEvidence, onchain: MintFactsV1 | null, fixture = false): CaIntelligenceV1 {
  const valid = isExactPublicKey(mint), concerns: Concern[] = [];
  if (!valid) return freeze({ version:'unfarmd-ca-intelligence/1',sourceGo:false,network:'solana-mainnet',mint:null,state:'unavailable',reason:'invalid_mint',identity:'not_checked',market:emptyMarket('not_observed'),onchain:null,concerns:[],unknowns:[...UNKNOWNS],limitations:[] });
  fixture ||= market.name.source?.captureKind === 'synthetic_fixture' || onchain?.source?.acquisition === 'synthetic_fixture';
  const replay = market.name.source?.captureKind === 'recorded_response' || onchain?.source?.acquisition === 'recorded_response';
  let identity: CaIntelligenceV1['identity'] = market.state === 'provider_reported' ? 'provider_reported_only' : 'not_checked';
  if (onchain && onchain.mint !== mint || onchain?.facts && market.tokenProgram.value !== null && market.tokenProgram.value !== onchain.facts.ownerProgram
      || onchain?.facts && market.decimals.value !== null && market.decimals.value !== String(onchain.facts.supply.decimals)
      || onchain?.status === 'not_a_supported_mint_account' && market.state === 'provider_reported') {
    return freeze({version:'unfarmd-ca-intelligence/1',sourceGo:false,network:'solana-mainnet',mint,state:fixture?'offline_fixture':'unavailable',reason:'conflicting_sources',identity:'conflicting',market:emptyMarket('conflicting_sources'),onchain:null,
      concerns:[{code:'conflicting_sources',severity:'concern',explanation:'Provider identity conflicts with the reported mint account. Market facts are withheld.',evidencePaths:['market.tokenProgram','market.decimals','onchain.status']}],unknowns:[...UNKNOWNS],limitations:['No source was preferred silently. Investigate exact mint/program identity before any interpretation.']});
  }
  if (onchain?.facts) {
    identity = 'rpc_observed_at_finalized_context';
    const f = onchain.facts;
    if (f.extensions.assessment === 'unreviewed') concerns.push({code:'unreviewed_extensions',severity:'unknown',explanation:'Token-2022 controls are not fully interpreted; base authority absence is not a guarantee.',evidencePaths:['onchain.facts.extensions']});
    else for (const k of ['mintAuthority','freezeAuthority'] as const) if (f[k].state === 'present') concerns.push({code:k+'_present',severity:'concern',explanation:k==='mintAuthority'?'A base mint authority is reported; this permission can issue more tokens. Signer control is unknown.':'A base freeze authority is reported; this permission can freeze token accounts. Signer control is unknown.',evidencePaths:['onchain.facts.'+k]});
  }
  if (market.liquidityUsd.value === '0') concerns.push({code:'zero_reported_liquidity',severity:'concern',explanation:'Provider reports zero USD liquidity. This does not establish an executable exit.',evidencePaths:['market.liquidityUsd']});
  if (market.state === 'unknown') concerns.push({code:'market_'+market.reason,severity:'unknown',explanation:'Market evidence is unavailable: '+market.reason+'. An unindexed token is not proof the mint does not exist.',evidencePaths:['market.reason']});
  const unknowns = [...UNKNOWNS, ...(!onchain?.facts ? ['onchain_mint_supply_and_controls_not_observed'] : [])];
  const state = fixture ? 'offline_fixture' : replay ? 'offline_replay' : market.state === 'provider_reported' || onchain?.facts ? 'partial' : 'unavailable';
  return freeze({version:'unfarmd-ca-intelligence/1',sourceGo:false,network:'solana-mainnet',mint,state,reason:market.reason,identity,market,onchain,concerns,unknowns,
    limitations:['No source licence or runtime activation is granted by this result.','RPC-reported context is not independent chain replay; receipt time is not market observation time.','Counts/price changes are labelled-window provider reports, not unique beneficial owners, persistent momentum, tradable returns or advice.']});
}
export function unavailable(mint: unknown, reason: UnknownReason): CaIntelligenceV1 {
  const r = assemble(mint, emptyMarket(reason), null); return freeze({...r,state:reason==='sources_off'&&r.mint?'sources_off':r.state,reason:r.mint?reason:r.reason});
}
