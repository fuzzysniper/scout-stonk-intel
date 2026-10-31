import type { RiskFinding } from '../../v4-owner-preview/view-contract';
import type { CohortData, CohortSummary, Detail, Evidence, ExitData, FarmAnalysis, FarmEvidenceInput, FundingData, HolderData, LiquidityData, Observation, Ratio, Transaction } from './contract';
import { address, clock, decimals, evidence, list, need, obj, observation, plain, raw, slot, snapshot, transaction, unique } from './validation';
export type * from './contract';

type Key = keyof FarmAnalysis['details'];
type Report = { tone: RiskFinding['tone']; value: string; explanation: string; metrics: Detail['metrics']; evidence: Evidence[]; transactions: Transaction[]; cohorts?: CohortSummary };
const TITLES: Record<Key, string> = { concentration: 'Token-account concentration', funding: 'Observed funding links', cohorts: 'Observed buyer cohorts', exits: 'Tracked early-wallet selling', liquidity: 'Pool-specific withdrawals' };
export const FARM_RULES = Object.freeze({ version: 'farm-evidence/1', topAccounts: 10, concentrationWatchBps: 2000, concentrationFlagBps: 5000, trackedSellFlagBps: 5000, withdrawalFlagBps: 2000 });
const ratio = (n: bigint, d: bigint): Ratio => ({ numeratorRaw: n.toString(), denominatorRaw: d.toString(), basisPointsFloor: d === 0n ? null : (n * 10_000n / d).toString() });
const percent = (r: Ratio): string => r.basisPointsFloor === null ? 'undefined' : `${BigInt(r.basisPointsFloor) / 100n}.${(BigInt(r.basisPointsFloor) % 100n).toString().padStart(2, '0')}%`;
const txKeys = ['signature','instructionIndex','status','slot','blockTime','evidence'];
const txRefs = (ts: readonly Transaction[]): Evidence[] => ts.map(t => t.evidence);
function classification(e: Evidence, o: Observation<unknown>, now: number): void {
  evidence(e, now, true); need(e.captureKind === o.evidence.captureKind, 'mixed_capture_kind');
  need(e.contextSlot === o.window.lastSlot, 'classification_slot');
}
function holders(o: Observation<HolderData>, now: number): Report {
  const d = o.data; obj(d, ['supplyRaw','decimals','snapshotSlot','population','accounts','exclusions']);
  decimals(d.decimals); slot(d.snapshotSlot); need(d.snapshotSlot === o.window.lastSlot && o.window.firstSlot === d.snapshotSlot && d.snapshotSlot === o.evidence.contextSlot && o.window.from === o.window.to && o.window.to === o.evidence.sourceAt, 'snapshot_boundary');
  need(['all_token_accounts','largest_token_accounts'].includes(d.population), 'invalid_population');
  const supply = raw(d.supplyRaw); need(supply > 0n, 'zero_supply'); list(d.accounts, 1); list(d.exclusions);
  for (const a of d.accounts) { obj(a, ['account','mint','owner','amountRaw']); address(a.account); need(a.mint === o.mint, 'mint_mismatch'); if (a.owner !== null) address(a.owner); raw(a.amountRaw); }
  unique(d.accounts.map(a => a.account));
  for (const e of d.exclusions) { obj(e, ['account','kind','evidence']); address(e.account); need(['pool','token_vault','cex','platform'].includes(e.kind), 'unknown_exclusion'); classification(e.evidence, o, now); need(d.accounts.some(a => a.account === e.account), 'missing_excluded_account'); }
  unique(d.exclusions.map(e => e.account)); const excluded = new Set(d.exclusions.map(e => e.account));
  const total = d.accounts.reduce((s, a) => s + raw(a.amountRaw), 0n);
  need(total <= supply && (d.population !== 'all_token_accounts' || total === supply), 'supply_reconciliation');
  const excludedRaw = d.accounts.filter(a => excluded.has(a.account)).reduce((s, a) => s + raw(a.amountRaw), 0n);
  const denominator = supply - excludedRaw; need(denominator > 0n, 'empty_denominator');
  const eligible = d.accounts.filter(a => !excluded.has(a.account)).sort((a, b) => raw(a.amountRaw) > raw(b.amountRaw) ? -1 : raw(a.amountRaw) < raw(b.amountRaw) ? 1 : a.account.localeCompare(b.account));
  need(eligible.length > 0, 'empty_population');
  const top = eligible.slice(0, FARM_RULES.topAccounts).reduce((s, a) => s + raw(a.amountRaw), 0n), share = ratio(top, denominator);
  const flag = top * 10_000n >= denominator * BigInt(FARM_RULES.concentrationFlagBps);
  const watch = top * 10_000n >= denominator * BigInt(FARM_RULES.concentrationWatchBps);
  return { tone: flag ? 'red' : watch || d.population !== 'all_token_accounts' ? 'yellow' : 'green', value: `${percent(share)} in ${Math.min(10, eligible.length)} accounts`,
    explanation: `Top observed eligible token accounts / supply minus ${d.exclusions.length} source-classified excluded accounts. ${d.population === 'all_token_accounts' ? 'Full supplied account snapshot reconciles to supply.' : 'Largest-account sample: unobserved distribution and other exclusions remain unknown.'} Accounts are not unique wallets or insiders. 20%/50% are screening thresholds, not fraud probabilities.`,
    metrics: { topAccountShare: share, supplyRaw: d.supplyRaw, decimals: d.decimals, excludedRaw: excludedRaw.toString(), excludedAccounts: excluded.size, sampledAccounts: d.accounts.length, population: d.population }, evidence: d.exclusions.map(e => e.evidence), transactions: [] };
}
function funding(o: Observation<FundingData>, now: number): Report {
  const d = o.data; obj(d, ['trackedWallets','edges']); list(d.trackedWallets, 1); need(d.trackedWallets.length <= 32, 'wallet_budget');
  d.trackedWallets.forEach(address); unique(d.trackedWallets); list(d.edges); const ids = new Set<string>(), tracked = new Set(d.trackedWallets);
  const groups = new Map<string, Set<string>>(); let direct = 0, nearPairs = 0, sameSlotPairs = 0;
  for (const e of d.edges) {
    obj(e, [...txKeys,'from','to','lamports']); address(e.from); address(e.to); need(e.from !== e.to && tracked.has(e.to) && raw(e.lamports) > 0n, 'invalid_funding_edge');
    transaction(e, o.window, now, ids, o.evidence.captureKind);
    const g = groups.get(e.from) ?? new Set<string>(); g.add(e.to); groups.set(e.from, g); if (tracked.has(e.from)) direct++;
  }
  for (let i = 0; i < d.edges.length; i++) for (let j = i + 1; j < d.edges.length; j++) {
    const a = d.edges[i], b = d.edges[j]; if (a.from !== b.from || a.to === b.to) continue;
    if (Math.abs(clock(a.blockTime) - clock(b.blockTime)) <= 60_000) nearPairs++;
    if (a.slot === b.slot) sameSlotPairs++;
  }
  const shared = [...groups.values()].filter(g => g.size > 1).length;
  return { tone: shared || direct ? 'yellow' : 'green', value: `${shared} shared funders / ${d.trackedWallets.length} tracked wallets`,
    explanation: `${d.edges.length} observed SOL funding transfers; ${direct} direct tracked-wallet links. ${nearPairs} shared-funder edge pairs within 60s; ${sameSlotPairs} in the same slot. These are links, not common beneficial ownership, a launch bundle or coordination proof. Exchange/service funding and fresh funder reuse are counterexamples. Only the declared wallets/window are covered.`,
    metrics: { trackedWallets: d.trackedWallets.length, fundingTransfers: d.edges.length, sharedFunders: shared, directLinks: direct, nearTimeEdgePairs: nearPairs, sameSlotEdgePairs: sameSlotPairs }, evidence: txRefs(d.edges), transactions: [...d.edges] };
}
function cohorts(o: Observation<CohortData>, now: number): Report {
  const d = o.data; obj(d, ['baseDecimals','quoteMint','quoteDecimals','pools','splitAt','trades']); decimals(d.baseDecimals); decimals(d.quoteDecimals); address(d.quoteMint); need(d.quoteMint !== o.mint, 'quote_mismatch');
  list(d.pools, 1); need(d.pools.length <= 16, 'pool_budget'); d.pools.forEach(address); unique(d.pools);
  const split = clock(d.splitAt); need(split > clock(o.window.from) && split < clock(o.window.to), 'invalid_cohort_window'); list(d.trades);
  const ids = new Set<string>(), prior = new Set<string>(), current = new Set<string>(), sellers = new Set<string>(); let buyCount = 0, quote = 0n;
  for (const t of d.trades) {
    obj(t, [...txKeys,'pool','mint','quoteMint','wallet','side','baseRaw','quoteRaw']); address(t.wallet); need(d.pools.includes(t.pool) && t.mint === o.mint && t.quoteMint === d.quoteMint, 'trade_identity'); need(['buy','sell'].includes(t.side) && raw(t.baseRaw) > 0n && raw(t.quoteRaw) > 0n, 'invalid_trade');
    transaction(t, o.window, now, ids, o.evidence.captureKind);
    if (clock(t.blockTime) < split) { if (t.side === 'buy') prior.add(t.wallet); }
    else if (t.side === 'buy') { current.add(t.wallet); buyCount++; quote += raw(t.quoteRaw); } else sellers.add(t.wallet);
  }
  const returning = [...current].filter(w => prior.has(w)).length;
  const summary: CohortSummary = { poolCount: d.pools.length, baselineBuyerWallets: prior.size, currentBuyerWallets: current.size, newToCoveredHistoryWallets: current.size - returning, returningBuyerWallets: returning, returningShare: ratio(BigInt(returning), BigInt(current.size)), roundTripWallets: [...current].filter(w => sellers.has(w)).length, buyTransactions: buyCount, quoteSpentRaw: quote.toString(), quoteMint: d.quoteMint, quoteDecimals: d.quoteDecimals };
  return { tone: current.size ? 'yellow' : 'gray', value: `${current.size - returning} new-to-window; ${returning}/${current.size} returning`,
    explanation: `Distinct buying addresses in ${d.pools.length} declared pools during the current window, compared only with the covered baseline. Other venues are not covered. New to this history does not mean a new person, authentic demand or first-ever buyer. Returning share uses current distinct buyer addresses; zero buyers has no ratio. Round trips may include wash trading or legitimate trading. Quote spent is summed executed buy consideration, not USD, unique capital or net inflow. Jupiter Organic Score is a provider heuristic and cannot verify these cohorts.`,
    metrics: { ...summary, coveredPools: d.pools.join(','), returningShare: summary.returningShare }, evidence: txRefs(d.trades), transactions: [...d.trades], cohorts: summary };
}
function exits(o: Observation<ExitData>, now: number): Report {
  const d = o.data; obj(d, ['baseDecimals','cohortCutoff','wallets','events']); decimals(d.baseDecimals); need(clock(d.cohortCutoff) <= clock(o.window.from), 'invalid_early_cutoff');
  list(d.wallets, 1); need(d.wallets.length <= 32, 'wallet_budget'); list(d.events); unique(d.wallets.map(w => w.wallet));
  const ids = new Set<string>(), earlyIds = new Set<string>(), balances = new Map<string, bigint>(); let opening = 0n, closing = 0n, bought = 0n, sold = 0n, incoming = 0n, outgoing = 0n;
  const refs: Evidence[] = [], transactions: Transaction[] = [];
  for (const w of d.wallets) {
    obj(w, ['wallet','firstObservedBuy','openingRaw','closingRaw','openingEvidence','closingEvidence']); address(w.wallet);
    const t = w.firstObservedBuy; obj(t, [...txKeys,'pool','mint','quoteMint','wallet','side','baseRaw','quoteRaw']); address(t.pool); address(t.quoteMint); need(t.wallet === w.wallet && t.mint === o.mint && t.quoteMint !== o.mint && t.side === 'buy' && raw(t.baseRaw) > 0n && raw(t.quoteRaw) > 0n, 'invalid_early_buy'); need(clock(t.blockTime) <= clock(d.cohortCutoff), 'not_observed_early');
    transaction(t, { ...o.window, from: t.blockTime, firstSlot: t.slot }, now, earlyIds, o.evidence.captureKind);
    need(t.slot <= o.window.firstSlot, 'not_observed_early'); snapshot(w.openingEvidence, o, now, 'from'); snapshot(w.closingEvidence, o, now, 'to');
    opening += raw(w.openingRaw); closing += raw(w.closingRaw); balances.set(w.wallet, raw(w.openingRaw));
    refs.push(w.openingEvidence, w.closingEvidence, t.evidence); transactions.push(t);
  }
  // Canonical chronological order; negative interim inventory or mismatched closing balance withholds all flows.
  const ordered = [...d.events].sort((a, b) => a.slot - b.slot || clock(a.blockTime) - clock(b.blockTime) || a.signature.localeCompare(b.signature) || a.instructionIndex - b.instructionIndex);
  for (const e of ordered) {
    obj(e, [...txKeys,'mint','wallet','kind','baseRaw']); address(e.wallet); need(e.mint === o.mint, 'mint_mismatch'); need(balances.has(e.wallet) && ['buy','sell','transfer_in','transfer_out'].includes(e.kind), 'untracked_exit');
    transaction(e, o.window, now, ids, o.evidence.captureKind); need(e.slot > o.window.firstSlot, 'snapshot_overlap'); const amount = raw(e.baseRaw); need(amount > 0n, 'invalid_exit_amount');
    const plus = e.kind === 'buy' || e.kind === 'transfer_in', next = balances.get(e.wallet)! + (plus ? amount : -amount); need(next >= 0n && next <= (1n << 64n) - 1n, 'inventory_reconciliation'); balances.set(e.wallet, next);
    if (e.kind === 'buy') bought += amount; else if (e.kind === 'sell') sold += amount; else if (e.kind === 'transfer_in') incoming += amount; else outgoing += amount;
  }
  for (const w of d.wallets) need(balances.get(w.wallet) === raw(w.closingRaw), 'inventory_reconciliation');
  const available = opening + bought + incoming, share = ratio(sold, available); need(available > 0n || sold === 0n, 'empty_inventory');
  return { tone: sold * 10_000n >= available * BigInt(FARM_RULES.trackedSellFlagBps) && available > 0n && sold > 0n ? 'red' : sold > 0n || outgoing > 0n ? 'yellow' : 'green', value: `${sold} raw sold / ${available} available`,
    explanation: `${d.wallets.length} wallets with a source-observed buy by the declared cutoff; not a complete launch cohort or insiders. Opening + buys + transfers in − sells − transfers out reconciles to closing. Net token change ${closing - opening} raw. Selling >=50% of available tracked inventory is a screening flag, not manipulation, profit, USD extraction or holder ROI. Transfers out are not sales.`,
    metrics: { trackedWallets: d.wallets.length, decimals: d.baseDecimals, openingRaw: opening.toString(), closingRaw: closing.toString(), boughtRaw: bought.toString(), soldRaw: sold.toString(), incomingTransferRaw: incoming.toString(), outgoingTransferRaw: outgoing.toString(), netPositionRaw: (closing - opening).toString(), soldShare: share }, evidence: [...refs, ...txRefs(d.events)], transactions: [...transactions, ...d.events] };
}
function liquidity(o: Observation<LiquidityData>, now: number): Report {
  const d = o.data; obj(d, ['pool','quoteMint','baseDecimals','quoteDecimals','openingBaseRaw','closingBaseRaw','openingQuoteRaw','closingQuoteRaw','openingEvidence','closingEvidence','events']);
  address(d.pool); address(d.quoteMint); need(d.quoteMint !== o.mint, 'quote_mismatch'); decimals(d.baseDecimals); decimals(d.quoteDecimals);
  const base = raw(d.openingBaseRaw), quote = raw(d.openingQuoteRaw), closeBase = raw(d.closingBaseRaw), closeQuote = raw(d.closingQuoteRaw);
  snapshot(d.openingEvidence, o, now, 'from'); snapshot(d.closingEvidence, o, now, 'to'); list(d.events);
  const ids = new Set<string>(), refs = [d.openingEvidence, d.closingEvidence]; let removedBase = 0n, removedQuote = 0n, feesBase = 0n, feesQuote = 0n, migrations = 0, removes = 0;
  for (const e of d.events) {
    obj(e, [...txKeys,'pool','mint','quoteMint','kind','recipient','baseRaw','quoteRaw','migration']); need(e.pool === d.pool && e.mint === o.mint && e.quoteMint === d.quoteMint, 'pool_identity'); need(['remove','fee'].includes(e.kind), 'invalid_pool_event'); address(e.recipient);
    transaction(e, o.window, now, ids, o.evidence.captureKind); need(e.slot > o.window.firstSlot, 'snapshot_overlap'); const b = raw(e.baseRaw), q = raw(e.quoteRaw); need(b + q > 0n, 'empty_pool_event');
    if (e.migration !== null) {
      obj(e.migration, [...txKeys,'destinationPool','mint','quoteMint','baseRaw','quoteRaw']); address(e.migration.destinationPool); need(e.kind === 'remove' && e.migration.destinationPool !== d.pool, 'invalid_migration');
      transaction(e.migration, o.window, now, ids, o.evidence.captureKind);
      need(e.migration.signature === e.signature && e.migration.slot === e.slot && e.migration.blockTime === e.blockTime
        && e.migration.mint === o.mint && e.migration.quoteMint === d.quoteMint && raw(e.migration.baseRaw) === b && raw(e.migration.quoteRaw) === q, 'unmatched_migration_receipt');
      migrations++; refs.push(e.migration.evidence);
    } else if (e.kind === 'remove') { removedBase += b; removedQuote += q; removes++; } else { feesBase += b; feesQuote += q; }
  }
  const flag = base > 0n && removedBase * 10_000n >= base * BigInt(FARM_RULES.withdrawalFlagBps) || quote > 0n && removedQuote * 10_000n >= quote * BigInt(FARM_RULES.withdrawalFlagBps);
  return { tone: flag ? 'red' : removes || migrations || feesBase || feesQuote || closeBase < base || closeQuote < quote ? 'yellow' : 'green', value: `${removes} removals; ${migrations} evidenced migrations`,
    explanation: 'Executed, decoded events for one exact pool, not withdrawal capability or complete token liquidity. Non-migration removed amounts / opening reserves are event-throughput ratios, not lost liquidity: deposits/trades can replenish reserves. >=20% is a screening flag. Evidenced migrations are separate, not assumed malicious or guaranteed legitimate. Fee recipient flows are separate from LP withdrawals. Reserve declines alone do not prove extraction; no USD or executable-exit claim.',
    metrics: { pool: d.pool, quoteMint: d.quoteMint, baseDecimals: d.baseDecimals, quoteDecimals: d.quoteDecimals, nonMigrationRemovals: removes, migrations, removedBaseRaw: removedBase.toString(), removedQuoteRaw: removedQuote.toString(), feeBaseRaw: feesBase.toString(), feeQuoteRaw: feesQuote.toString(), removedBaseShare: ratio(removedBase, base), removedQuoteShare: ratio(removedQuote, quote), netBaseReserveRaw: (closeBase - base).toString(), netQuoteReserveRaw: (closeQuote - quote).toString() }, evidence: [...refs, ...txRefs(d.events)], transactions: [...d.events, ...d.events.flatMap(e => e.migration ? [e.migration] : [])] };
}
function freeze<T>(v: T): T { if (v && typeof v === 'object') { for (const x of Object.values(v)) freeze(x); Object.freeze(v); } return v; }
/** Pure offline projection. Does not fetch, authenticate raw bytes, persist, enroll or activate anything. */
export function analyzeFarmEvidence(input: FarmEvidenceInput): FarmAnalysis {
  const keys = Object.keys(TITLES) as Key[], findings: RiskFinding[] = [], details = {} as Record<Key, Detail>; let cohort: CohortSummary | null = null;
  let valid = false, now = 0;
  try {
    plain(input); obj(input, ['mint','asOf'], ['holders','funding','cohorts','exits','liquidity']); address(input.mint); now = clock(input.asOf);
    const units = [input.holders?.data.decimals, input.cohorts?.data.baseDecimals, input.exits?.data.baseDecimals, input.liquidity?.data.baseDecimals].filter(v => v !== undefined);
    need(units.every(v => v === units[0]), 'contradictory_units');
    if (input.cohorts && input.liquidity && input.cohorts.data.quoteMint === input.liquidity.data.quoteMint) need(input.cohorts.data.quoteDecimals === input.liquidity.data.quoteDecimals, 'contradictory_quote_units');
    valid = true;
  } catch { /* No reflection of untrusted values or exceptions. */ }
  for (const key of keys) {
    const title = TITLES[key];
    try {
      need(valid, 'invalid_input'); const o = input[key === 'concentration' ? 'holders' : key]; need(o, 'missing_observation'); observation<unknown>(o, input.mint, now);
      const report = key === 'concentration' ? holders(o as Observation<HolderData>, now) : key === 'funding' ? funding(o as Observation<FundingData>, now) : key === 'cohorts' ? cohorts(o as Observation<CohortData>, now) : key === 'exits' ? exits(o as Observation<ExitData>, now) : liquidity(o as Observation<LiquidityData>, now);
      const source = `${o.evidence.captureKind === 'synthetic_fixture' ? 'SYNTHETIC fixture' : 'Provided source record'} · ${o.evidence.provider}`;
      findings.push({ id: `farming-${key}`, pillar: 'farm', tone: report.tone, title, value: report.value, explanation: report.explanation, fieldPath: `farmEvidence.details.${key}`, source, observedAt: o.evidence.sourceAt, responseSha256: o.evidence.responseSha256 });
      // Copy JSON data so freezing the result never freezes/mutates the caller's objects.
      details[key] = JSON.parse(JSON.stringify({ status: 'reported', reason: 'validated_provided_observations', evidence: [o.evidence, ...report.evidence], transactions: report.transactions, window: o.window, metrics: report.metrics })) as Detail;
      if (report.cohorts) cohort = report.cohorts;
    } catch (error) {
      const category = error instanceof Error && ['missing_observation','stale_source','incomplete_coverage','rights_hold','mint_mismatch','source_clock_order'].includes(error.message) ? error.message : 'invalid_observation';
      const reason = valid ? category : 'invalid_input';
      const qualifier = reason === 'stale_source' ? 'Source is stale.' : reason === 'incomplete_coverage' ? 'Coverage is partial or unavailable.' : reason === 'rights_hold' ? 'Private-analysis rights are not approved.' : 'Evidence unavailable or inconsistent.';
      findings.push({ id: `farming-${key}`, pillar: 'farm', tone: 'gray', title, value: null, explanation: `${qualifier} No usable complete, timely, finalized exact-mint observations with approved private-analysis rights. Withheld evidence is not a passed check.`, fieldPath: null, source: null, observedAt: null, responseSha256: null });
      details[key] = { status: 'withheld', reason, evidence: [], transactions: [], window: null, metrics: {} };
    }
  }
  return freeze({ findings, details, cohorts: cohort });
}
export function projectFarmEvidence(input: FarmEvidenceInput): readonly RiskFinding[] { return analyzeFarmEvidence(input).findings; }
