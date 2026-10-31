import type { RiskFinding } from '../../v4-owner-preview/view-contract';

/** Provided observations, never a request/admission or verification capability. */
export type Evidence = Readonly<{
  provider: 'solana_rpc' | 'helius_indexer';
  captureKind: 'synthetic_fixture' | 'recorded_response' | 'native_https';
  network: 'solana-mainnet-beta'; commitment: 'finalized';
  responseSha256: string; fieldPath: string;
  clockKind: 'provider_as_of' | 'finalized_block_time';
  /** Declared provider as-of OR the context slot's corroborated block-time estimate. Never receipt time or last account change. */
  sourceAt: string; receivedAt: string; contextSlot: number;
  rights: Readonly<{ analysis: 'approved_private' | 'unreviewed' | 'restricted'; reviewSha256: string | null }>;
}>;
export type Transaction = Readonly<{
  signature: string; instructionIndex: number; status: 'succeeded'; slot: number; blockTime: string; evidence: Evidence;
}>;
export type Window = Readonly<{ from: string; to: string; firstSlot: number; lastSlot: number; status: 'complete' | 'partial' | 'unavailable' }>;
export type Observation<T> = Readonly<{ mint: string; evidence: Evidence; window: Window; data: T }>;
export type HolderData = Readonly<{
  supplyRaw: string; decimals: number; snapshotSlot: number;
  population: 'all_token_accounts' | 'largest_token_accounts';
  accounts: readonly Readonly<{ account: string; mint: string; owner: string | null; amountRaw: string }>[];
  /** Each exclusion needs an independently reviewed classification record. */
  exclusions: readonly Readonly<{ account: string; kind: 'pool' | 'token_vault' | 'cex' | 'platform'; evidence: Evidence }>[];
}>;
export type FundingData = Readonly<{
  trackedWallets: readonly string[];
  edges: readonly (Transaction & Readonly<{ from: string; to: string; lamports: string }>)[];
}>;
export type Trade = Transaction & Readonly<{ pool: string; mint: string; quoteMint: string; wallet: string; side: 'buy' | 'sell'; baseRaw: string; quoteRaw: string }>;
export type CohortData = Readonly<{
  baseDecimals: number; quoteMint: string; quoteDecimals: number; pools: readonly string[];
  /** [from, splitAt) is the baseline; [splitAt, to] the current window. */
  splitAt: string; trades: readonly Trade[];
}>;
export type ExitData = Readonly<{
  baseDecimals: number; cohortCutoff: string;
  wallets: readonly Readonly<{
    wallet: string; firstObservedBuy: Trade;
    openingRaw: string; closingRaw: string; openingEvidence: Evidence; closingEvidence: Evidence;
  }>[];
  events: readonly (Transaction & Readonly<{ mint: string; wallet: string; kind: 'buy' | 'sell' | 'transfer_in' | 'transfer_out'; baseRaw: string }>)[];
}>;
export type LiquidityData = Readonly<{
  pool: string; quoteMint: string; baseDecimals: number; quoteDecimals: number;
  openingBaseRaw: string; closingBaseRaw: string; openingQuoteRaw: string; closingQuoteRaw: string;
  openingEvidence: Evidence; closingEvidence: Evidence;
  events: readonly (Transaction & Readonly<{
    pool: string; mint: string; quoteMint: string; kind: 'remove' | 'fee'; recipient: string; baseRaw: string; quoteRaw: string;
    /** A removal alone is not proof of migration or wrongdoing. */
    migration: (Transaction & Readonly<{ destinationPool: string; mint: string; quoteMint: string; baseRaw: string; quoteRaw: string }>) | null;
  }>)[];
}>;
export type FarmEvidenceInput = Readonly<{
  mint: string; asOf: string;
  holders?: Observation<HolderData>; funding?: Observation<FundingData>;
  cohorts?: Observation<CohortData>; exits?: Observation<ExitData>; liquidity?: Observation<LiquidityData>;
}>;
export type Ratio = Readonly<{ numeratorRaw: string; denominatorRaw: string; basisPointsFloor: string | null }>;
export type CohortSummary = Readonly<{
  poolCount: number;
  baselineBuyerWallets: number; currentBuyerWallets: number; newToCoveredHistoryWallets: number;
  returningBuyerWallets: number; returningShare: Ratio; roundTripWallets: number;
  buyTransactions: number; quoteSpentRaw: string; quoteMint: string; quoteDecimals: number;
}>;
export type Detail = Readonly<{
  status: 'reported' | 'withheld'; reason: string;
  /** Original source references; hashes are declared references, not byte-authentication by this projector. */
  evidence: readonly Evidence[]; transactions: readonly Transaction[];
  window: Window | null;
  metrics: Readonly<Record<string, string | number | null | Ratio>>;
}>;
export type FarmAnalysis = Readonly<{
  findings: readonly RiskFinding[];
  details: Readonly<Record<'concentration' | 'funding' | 'cohorts' | 'exits' | 'liquidity', Detail>>;
  cohorts: CohortSummary | null;
}>;
