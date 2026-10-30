import 'server-only';
import type { CaLookup } from './contract';
import { unavailable } from './result';
export type { CaIntelligenceV1, CaLookup, Evidence, MarketEvidence, SourceRef, TradingWindow } from './contract';
export const CA_SOURCE = Object.freeze({ enabled:false,sourceGo:false,retries:0 } as const);
/** Universal exact-mint FORMAT handling; no provider selected, options/env/key/authorization/ledger reads or requests. */
export function createCaLookup(): CaLookup {
  return Object.freeze({lookup:async (_request: Request,mint:unknown)=>unavailable(mint,'sources_off')});
}
