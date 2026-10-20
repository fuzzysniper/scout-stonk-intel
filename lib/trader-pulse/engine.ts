import type { PulseReport, Signal } from './contract';
import { LIMITS } from './contract';
import { isValidated, type ValidatedSnapshot } from './decoder';
import { deepFreeze, validTime } from './validation';

/** Pure, deterministic calculation on an immutable validated packet. No clock or I/O inside. */
export function evaluatePulse(snapshot: ValidatedSnapshot, evaluatedMs: number): PulseReport {
  if (!isValidated(snapshot) || !validTime(evaluatedMs)) throw new Error('invalid_evaluation');
  const clock = snapshot.source.clock, pool = snapshot.selectedPool;
  const retrievalMs = Date.parse(clock.retrievedAt);
  const elapsed = evaluatedMs - retrievalMs;
  const stale = elapsed > LIMITS.retrievalMaxAgeMs;
  const future = elapsed < 0;
  const blocked = stale ? 'retrieval_expired' : future ? 'retrieval_in_future' : !pool ? snapshot.identity : null;
  const signal = <T>(ruleId: string, fields: string[], value: T | null, interpretation: string, reasons: string[] = [], observed = false): Signal<T> => ({
    state: blocked || value === null ? 'unavailable' : observed ? 'observed' : 'uncertain',
    ruleId, value: blocked ? null : value, providerFields: fields, clock,
    reasons: blocked ? [blocked] : value === null ? reasons : observed ? reasons : ['market_observation_time_unknown'], interpretation,
  });
  const five = pool?.txns.m5 ?? null, hour = pool?.txns.h1 ?? null;
  const windowsMismatch = !!(five && hour && (five.buys > hour.buys || five.sells > hour.sells));
  const volumeMismatch = !!(pool && pool.volumeUsd.m5 !== null && pool.volumeUsd.h1 !== null && pool.volumeUsd.m5 > pool.volumeUsd.h1);
  const n5 = five ? five.buys + five.sells : null, n60 = hour ? hour.buys + hour.sells : null;
  const ageMs = pool?.pairCreatedAt == null ? null : retrievalMs - pool.pairCreatedAt;
  // Reject plausible-looking seconds-as-ms (pre-Solana), and future creation clocks.
  const badAge = pool?.pairCreatedAt != null && (pool.pairCreatedAt < Date.UTC(2020, 2, 16) || ageMs! < 0);
  const activity = n5 !== null && n60 !== null && !windowsMismatch ? {
    fiveMinuteTransactions: n5, oneHourTransactions: n60, fiveMinutePerMinute: n5 / 5, oneHourPerMinute: n60 / 60,
    ratio: n60 === 0 ? null : (n5 * 12) / n60,
    comparison: n60 === 0 ? 'no_reported_activity' as const : n5 * 12 > n60 ? 'higher' as const : n5 * 12 < n60 ? 'lower' as const : 'equal' as const,
    baseline: 'overlapping_hour_includes_last_five_minutes' as const,
  } : null;
  const flags: string[] = ['market_observation_time_unknown'];
  if (!pool) flags.push(snapshot.identity);
  if (snapshot.scope.quoteMatches) flags.push('quote_side_matches_not_attributed');
  if (pool?.liquidityUsd == null) flags.push('liquidity_missing');
  else if (pool.liquidityUsd === 0) flags.push('reported_zero_liquidity');
  if (windowsMismatch) flags.push('transaction_windows_inconsistent');
  if (volumeMismatch) flags.push('volume_windows_inconsistent');
  if (ageMs === null) flags.push('pool_creation_time_missing');
  else if (badAge) flags.push('pool_creation_time_invalid');
  else if (ageMs < 3600000) flags.push('reported_pool_under_one_hour');
  if (!five || !hour) flags.push('transaction_windows_missing');
  if (pool && Object.values(pool.priceChangePercent).some(v => v !== null)) flags.push('price_change_clock_unqualified');
  if (stale) flags.push('retrieval_expired'); if (future) flags.push('retrieval_in_future');
  const report: PulseReport = {
    schemaVersion: 1, policy: 'scout-pulse-v1', evaluatedAt: new Date(evaluatedMs).toISOString(),
    mint: snapshot.requestedMint, requestedQuoteMint: snapshot.requestedQuoteMint, poolAddress: pool?.pairAddress ?? null,
    pair: pool ? { baseMint: pool.base.mint, quoteMint: pool.quote.mint, dexId: pool.dexId, sourceUrl: pool.sourceUrl,
      selection: 'highest_reported_liquidity_in_bounded_eligible_base_sample_then_ascii_pool' } : null,
    source: snapshot.source, scope: snapshot.scope, identity: snapshot.identity,
    liquidity: signal('liquidity.reported-usd.v1', ['liquidity.usd'], pool?.liquidityUsd == null ? null : { reportedUsd: pool.liquidityUsd, unit: 'USD' },
      'Provider-reported pool liquidity; not executable depth, slippage or locked reserves.', ['liquidity_missing']),
    activityAcceleration: signal('activity.count-rate-5m-vs-1h.v1', ['txns.m5.buys', 'txns.m5.sells', 'txns.h1.buys', 'txns.h1.sells'], activity,
      'Transaction-count rates in provider-labeled overlapping windows; not independently observed acceleration or unique traders.',
      windowsMismatch ? ['transaction_windows_inconsistent'] : ['transaction_windows_missing']),
    transactionImbalance: signal('imbalance.base-count-5m.v1', ['txns.m5.buys', 'txns.m5.sells'], five && n5! > 0 && !windowsMismatch ? {
      window: 'm5', buys: five.buys, sells: five.sells, total: n5!, normalizedDifference: (five.buys - five.sells) / n5!,
      direction: five.buys > five.sells ? 'buy_count_heavier' : five.buys < five.sells ? 'sell_count_heavier' : 'balanced', orientation: 'provider_base_token',
    } : null, 'Count imbalance, not dollar flow, buying pressure, unique people or a trade recommendation.',
      windowsMismatch ? ['transaction_windows_inconsistent'] : five ? ['no_reported_transactions'] : ['transaction_windows_missing']),
    poolAge: signal('age.reported-creation.v1', ['pairCreatedAt'], ageMs !== null && !badAge ? {
      reportedCreatedAt: new Date(pool!.pairCreatedAt!).toISOString(), elapsedSecondsAtRetrieval: ageMs / 1000,
      context: ageMs < 3600000 ? 'under_one_hour' : ageMs < 86400000 ? 'one_hour_to_one_day' : 'at_least_one_day',
    } : null, 'Age from provider-reported pool creation to retrieval; not token age, liquidity lock or safety.',
      [badAge ? 'pool_creation_time_invalid' : 'pool_creation_time_missing']),
    priceImpulse: signal<never>('price.qualified-clock-required.v1', ['priceChange.m5', 'priceUsd'], null,
      'Withheld: API does not establish an underlying market/window clock. Retrieval, HTTP Date and pool creation do not qualify it.', ['provider_market_clock_unqualified']),
    // This observes packet defects, not financial safety. Still available for a missing/stale market.
    redFlags: { state: 'observed', ruleId: 'quality.packet-red-flags.v1', value: { flags, assessment: 'limited_checks_not_safety_clearance' },
      providerFields: ['chainId', 'baseToken.address', 'quoteToken.address', 'liquidity.usd', 'txns', 'volume', 'pairCreatedAt', 'priceChange'], clock,
      reasons: [], interpretation: 'Limited packet/identity/time checks; absence of additional flags never means safe, genuine, liquid or profitable.' },
    publication: 'withheld_pending_source_rights_and_clock_review',
  };
  return deepFreeze(report);
}
