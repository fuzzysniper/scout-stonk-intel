import { POLICY, LIMITS, MINUTE, canonical, floor, freeze, hash, iso, micros, plan, time, units, type Bar, type Capture, type Plan } from './model';
import { assertCapture } from './normalize';
const reports = new WeakSet<object>();
const policySnapshot = Object.fromEntries(Object.entries(POLICY).map(([k, v]) => [k, typeof v === 'bigint' ? v.toString() : v]));
const riskUnknowns = ['finalized_mint_controls', 'token_2022_review', 'token_birth', 'holder_concentration', 'deployer_relationships', 'liquidity_depth', 'buy_sell_participation', 'native_fees_and_quote_conversion', 'size_aware_exit_capacity'];
type Row = { bar: Bar; capture: Capture; issues: string[]; duplicateCount: number; deliveryLagUs: string };
function evidence(r: Row) {
 return { start: r.bar.start, end: r.bar.end, open: r.bar.open?.original ?? null, high: r.bar.high?.original ?? null, low: r.bar.low?.original ?? null, close: r.bar.close?.original ?? null, baseVolume: r.bar.baseVolume?.original ?? null, quoteVolume: r.bar.quoteVolume?.original ?? null, containsTrades: r.bar.containsTrades, complete: r.bar.complete, barHash: r.bar.contentHash, packetHash: r.capture.packetHash, availableAt: r.capture.availableAt, receivedAt: r.capture.receivedAt, sourceId: r.capture.source.id, sourceGeneratedAt: r.capture.source.generatedAt, requestedAt: r.capture.requestedAt, sourceClock: r.capture.source.clock, latency: r.capture.source.latency, deliveryLagUs: r.deliveryLagUs, duplicateCount: r.duplicateCount, issues: r.issues };
}
function view(captures: readonly Capture[], cutoff: string) {
 const available = [...new Map(captures.filter(c => micros(c.availableAt) <= micros(cutoff)).map(c => [c.packetHash, c])).values()].sort((a, b) => micros(a.availableAt) < micros(b.availableAt) ? -1 : micros(a.availableAt) > micros(b.availableAt) ? 1 : a.packetHash < b.packetHash ? -1 : 1);
 const groups = new Map<string, { bar: Bar; capture: Capture }[]>();
 for (const capture of available) for (const bar of capture.bars) { const key = micros(bar.start).toString(); const list = groups.get(key) ?? []; list.push({ bar, capture }); groups.set(key, list); }
 const metadataIssues: string[] = [];
 if (new Set(available.map(c => c.source.id)).size > 1) metadataIssues.push('source_identity_conflict');
 if (new Set(available.map(c => c.poolCreatedAt).filter(x => x !== null)).size > 1) metadataIssues.push('pool_creation_conflict');
 const rows = new Map<string, Row>();
 for (const [key, versions] of groups) {
  const first = versions[0], issues: string[] = [...metadataIssues];
  if (new Set(versions.map(x => x.bar.contentHash)).size > 1) issues.push(new Set(versions.map(x => x.capture.availableAt)).size === 1 ? 'conflicting_same_time_versions' : 'revised_completed_bar');
  for (const { bar, capture } of versions) {
   if (!bar.complete) issues.push('incomplete_candle');
   if ([bar.open, bar.high, bar.low, bar.close].some(x => x === null)) issues.push('missing_price');
   if (!bar.baseVolume || !bar.quoteVolume) issues.push('missing_volume');
   if (bar.containsTrades !== true) issues.push('trade_presence_unverified');
   if (capture.source.clock !== 'fixture_defined' || capture.source.generatedAt === null) issues.push('source_clock_unverified');
   if (capture.source.latency !== 'fixture_bounded') issues.push('latency_unknown');
   if (micros(capture.receivedAt) - micros(capture.requestedAt) > 8_000_000n) issues.push('transport_latency_exceeded');
   if (micros(capture.availableAt) - micros(bar.end) > 300_000_000n) issues.push('late_bar_delivery');
  }
  rows.set(key, { ...first, issues: [...new Set(issues)], duplicateCount: versions.length - 1, deliveryLagUs: (micros(first.capture.availableAt) - micros(first.bar.end)).toString() });
 }
 return { available, rows, metadataIssues, discoveredAt: available[0]?.availableAt ?? null, poolCreatedAt: available[0]?.poolCreatedAt ?? null };
}
function window(v: ReturnType<typeof view>, start: bigint, count: number, cutoff: string) {
 const rows: Row[] = [], missing: string[] = [], issues = new Set<string>(v.metadataIssues);
 for (let i = 0; i < count; i++) {
  const at = start + BigInt(i) * MINUTE;
  if (at + MINUTE > micros(cutoff)) continue; // Future intervals are not missing observations yet.
  const row = v.rows.get(at.toString());
  if (!row) { missing.push(iso(at)); issues.add('missing_interval'); }
  else { rows.push(row); for (const issue of row.issues) issues.add(issue); }
 }
 return { rows, missing, issues: [...issues], duplicateCount: rows.reduce((n, r) => n + r.duplicateCount, 0) };
}
function qualify(captures: readonly Capture[], at: string) {
 const v = view(captures, at), end = floor(micros(at), MINUTE), start = end - BigInt(POLICY.lookbackMinutes) * MINUTE;
 const w = window(v, start, POLICY.lookbackMinutes, at), issues = [...w.issues];
 if (!v.poolCreatedAt) issues.push('reported_pool_age_unknown');
 else if (micros(at) - micros(v.poolCreatedAt) > POLICY.maxReportedPoolAgeUs) issues.push('reported_pool_age_exceeded');
 const latest = [...v.rows.values()].filter(r => r.bar.complete && micros(r.bar.end) <= micros(at)).sort((a, b) => micros(a.bar.end) > micros(b.bar.end) ? -1 : 1)[0];
 if (!latest || micros(at) - micros(latest.bar.end) > POLICY.frontierMaxAgeUs) issues.push('stale_frontier');
 let matched = false, features: null | { unit: string; recentQuoteVolumeScaled18: string; previousQuoteVolumeScaled18: string; firstOpen: string; lastClose: string } = null;
 if (!issues.length && w.rows.length === 20) {
  const volumes = w.rows.map(r => units(r.bar.quoteVolume!)), previous = volumes.slice(0, 10).reduce((a, b) => a + b, 0n), recent = volumes.slice(10).reduce((a, b) => a + b, 0n), a = volumes.slice(10, 15).reduce((a, b) => a + b, 0n), b = volumes.slice(15).reduce((a, b) => a + b, 0n);
  const first = units(w.rows[0].bar.open!), last = units(w.rows.at(-1)!.bar.close!);
  matched = previous > 0n && recent >= 2n * previous && 2n * a > previous && 2n * b > previous && last > first && last * 4n <= first * 5n;
  features = { unit: 'exact_wSOL_quote_volume', recentQuoteVolumeScaled18: recent.toString(), previousQuoteVolumeScaled18: previous.toString(), firstOpen: w.rows[0].bar.open!.original, lastClose: w.rows.at(-1)!.bar.close!.original };
 }
 return { state: issues.length ? 'INSUFFICIENT_EVIDENCE' : matched ? 'SYNTHETIC_PATTERN_OBSERVED' : 'PATTERN_NOT_OBSERVED', issues: [...new Set(issues)], window: { start: iso(start), end: iso(end), required: 20, available: w.rows.length, missing: w.missing, duplicateCount: w.duplicateCount }, features };
}
function outcome(captures: readonly Capture[], decisionAt: string, asOf: string) {
 const target = micros(decisionAt) + POLICY.referenceDelayUs, start = floor(target + MINUTE - 1n, MINUTE), count = POLICY.horizonMinutes + 1, end = start + BigInt(count) * MINUTE;
 const v = view(captures, asOf), w = window(v, start, count, asOf);
 const base = { referenceStart: iso(start), horizonEnd: iso(end), availableSamples: w.rows.length, requiredSamples: count, missing: w.missing, issues: w.issues, duplicates: w.duplicateCount, windowEvidence: w.rows.map(evidence), exit: 'UNKNOWN_NO_DEPTH_COST_OR_FILL_EVIDENCE', netReturn: null, realizedReturn: null, claim: 'SYNTHETIC_OBSERVED_PRICE_PATH_NOT_EXECUTABLE_RETURN' };
 if (micros(asOf) < end) return { ...base, state: 'PENDING', referenceClose: null, finalClose: null, direction: null, expansion: null };
 if (w.issues.length || w.rows.length !== count) return { ...base, state: 'WITHHELD', referenceClose: null, finalClose: null, direction: null, expansion: null };
 const ref = units(w.rows[0].bar.close!), final = units(w.rows.at(-1)!.bar.close!);
 const expansion = [2, 5, 10].map(multiple => {
  let first: string | null = null, confirmed: string | null = null, observationAvailableAt: string | null = null;
  for (let i = 0; i < w.rows.length; i++) {
   const reached = units(w.rows[i].bar.close!) >= BigInt(multiple) * ref;
   if (reached && first === null) first = w.rows[i].bar.end;
   if (i > 0 && reached && units(w.rows[i - 1].bar.close!) >= BigInt(multiple) * ref) { confirmed = w.rows[i].bar.end; const times = [w.rows[i - 1].capture.availableAt, w.rows[i].capture.availableAt]; observationAvailableAt = micros(times[0]) > micros(times[1]) ? times[0] : times[1]; break; }
  }
  return { multiple, firstObservedCloseAt: first, twoCloseConfirmationAt: confirmed, confirmed, observationAvailableAt };
 });
 return { ...base, state: 'SYNTHETIC_PRICE_PATH_OBSERVED', referenceClose: w.rows[0].bar.close!.original, finalClose: w.rows.at(-1)!.bar.close!.original, direction: final < ref ? 'lower' : final > ref ? 'higher' : 'unchanged', expansion };
}
/** All roster subjects are returned, including rejects and subjects with no packets. */
export function evaluateStudy(rawPlan: unknown, captures: readonly Capture[], asOf: string) {
 time(asOf); const p: Plan = plan(rawPlan);
 if (!Array.isArray(captures) || captures.length > LIMITS.captures) throw Error('capture_count_limit');
 let bytes = 0, rows = 0;
 for (const c of captures) {
  assertCapture(c); bytes += c.bytes; rows += c.bars.length;
  if (bytes > LIMITS.aggregateBytes || rows > LIMITS.rows) throw Error('aggregate_limit');
  if (!p.subjects.some(s => canonical(s.identity) === canonical(c.identity))) throw Error('unregistered_subject');
  if (micros(c.availableAt) < micros(p.registeredAt)) throw Error('cohort_registered_after_evidence');
 }
 if (micros(asOf) < micros(p.registeredAt)) throw Error('cohort_not_yet_registered');
 const planHash = hash(canonical(p));
 const candidates = p.subjects.map(s => {
  const subjectCaptures = captures.filter(c => canonical(c.identity) === canonical(s.identity));
  const v = view(subjectCaptures, asOf), discovered = v.discoveredAt;
  const decisionAt = discovered ? iso(micros(discovered) + POLICY.checkpointOffsetUs) : null;
  let firstPatternAt: string | null = null;
  if (discovered) {
   const until = decisionAt && micros(decisionAt) < micros(asOf) ? decisionAt : asOf;
   for (const t of [...new Set(v.available.map(c => c.availableAt))].sort((a, b) => micros(a) < micros(b) ? -1 : 1)) {
    if (micros(t) > micros(until)) break;
    if (qualify(subjectCaptures, t).state === 'SYNTHETIC_PATTERN_OBSERVED') { firstPatternAt = t; break; }
   }
  }
  const decision = decisionAt && micros(decisionAt) <= micros(asOf) ? (() => {
   const known = view(subjectCaptures, decisionAt), qualification = qualify(subjectCaptures, decisionAt);
   const windowEvidence = window(known, floor(micros(decisionAt), MINUTE) - 20n * MINUTE, 20, decisionAt).rows.map(evidence);
   const body = { identity: s.identity, at: decisionAt, windowEvidence, assurance: 'SYNTHETIC_OFFLINE', scriptedNotIndependentlyWitnessed: true, planHash, policy: policySnapshot, evidencePacketHashes: known.available.map(c => c.packetHash).sort(), qualification, disposition: s.disposition === 'reject' ? 'REJECT' : 'WAIT', rationale: s.reason, missingRiskEvidence: riskUnknowns };
   return { ...body, hash: hash(canonical(body)) };
  })() : null;
  return { identity: s.identity, registeredDisposition: s.disposition, admissionReason: s.reason, firstDiscoveredAt: discovered, reportedPoolCreatedAt: v.poolCreatedAt, discoveryEvidence: v.available[0] ? { packetHash: v.available[0].packetHash, requestedAt: v.available[0].requestedAt, receivedAt: v.available[0].receivedAt, availableAt: v.available[0].availableAt, source: v.available[0].source } : null, mintCreationAt: null, discoveryLagUs: discovered && v.poolCreatedAt ? (micros(discovered) - micros(v.poolCreatedAt)).toString() : null, discoveryLagAssurance: 'fixture_provider_claim_not_token_age', firstObservablePatternAt: firstPatternAt, plannedDecisionAt: decisionAt, decision, outcome: decisionAt && decision ? outcome(subjectCaptures, decisionAt, asOf) : null };
 });
 const report = freeze({ version: 'offline-market-report/1', assurance: 'SYNTHETIC_OFFLINE', label: 'INVENTED OFFLINE DATA — NO REAL TOKEN OPPORTUNITIES OR RETURNS', asOf, planHash, policy: policySnapshot, cohort: { enrolled: p.subjects.length, registeredRejections: p.subjects.filter(s => s.disposition === 'reject').length, decisions: candidates.filter(c => c.decision).length, rejected: candidates.filter(c => c.decision?.disposition === 'REJECT').length, unpricedOrPending: candidates.filter(c => !c.outcome || c.outcome.state !== 'SYNTHETIC_PRICE_PATH_OBSERVED').length }, candidates, realMoneyEligible: 0, liveNav: null, alphaEstimate: null, publication: 'WITHHELD_RIGHTS_UNRESOLVED', liveAcquisition: 'DISCONNECTED_NO_ADAPTER' });
 reports.add(report); return report;
}
export type ResearchReport = ReturnType<typeof evaluateStudy>;

export function assertReport(x: ResearchReport): void { if (!reports.has(x)) throw Error('engine_report_required'); }
