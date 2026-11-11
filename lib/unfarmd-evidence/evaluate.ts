import { VERSION, type EvidenceAssessment, type EvidenceEntry, type EvidenceReport, type EvaluationContext, type Rights, type Entitlement, type ValidationResult } from "./contract";
import { nanos } from "./primitives";
import { validateContext, validateEvidence } from "./validate";
function rightsReasons(r: Rights, e: Entitlement, context: EvaluationContext, prefix: string): string[] {
  const reasons: string[] = [];
  if (r.status !== "permitted" || !r.reference || !r.uses.includes(context.intendedUse)) reasons.push(`${prefix}_rights_unconfirmed`);
  // This contract is intended to support decision records; ephemeral viewing cannot imply retention rights.
  if (r.retention !== "permitted") reasons.push(`${prefix}_retention_unconfirmed`);
  if (e.status !== "authorized" || !e.reference) reasons.push(`${prefix}_entitlement_unconfirmed`);
  return reasons;
}
/** Pure classification of supplied metadata. Never an adapter, source authorization or investment recommendation. */
export function evaluateEvidence(input: unknown, contextInput: unknown): ValidationResult<EvidenceReport> {
  const parsed = validateEvidence(input), ctx = validateContext(contextInput);
  if (!parsed.ok) return parsed;
  if (!ctx.ok) return ctx;
  const doc = parsed.value, context = ctx.value, now = nanos(context.evaluatedAt);
  const policies = new Map((context.sourcePolicies ?? []).map(p => [p.sourceId, p]));
  const conflicted = new Set<string>();
  for (const e of doc.entries) for (const id of e.contradicts) { conflicted.add(e.id); conflicted.add(id); }
  const assessments: EvidenceAssessment[] = doc.entries.map(e => {
    const reasons: string[] = [];
    if (context.mode === "offline_fixture" || e.origin === "synthetic_fixture") reasons.push("synthetic_not_live_evidence");
    if (doc.asset.state !== "exact_identifier" || !doc.asset.asset.assetKey) reasons.push("identity_unresolved");
    if (e.assetKey !== doc.asset.asset.assetKey || !e.assetKey) reasons.push("asset_identity_mismatch");
    if (e.origin === "user_entry") reasons.push("user_entered_not_source_verified");
    if (conflicted.has(e.id)) reasons.push("contradictory_evidence");
    if (e.category === "counterevidence") reasons.push("counterevidence_requires_review");
    if (e.category === "unavailable") reasons.push("data_unavailable");
    if (e.representation === "derived") reasons.push("derivation_method_not_reviewed");
    if (e.verification.tier === "unverified") reasons.push("verification_unverified");
    if (!e.reference) reasons.push("provenance_reference_missing");
    if ((e.verification.tier === "corroborated" || e.verification.tier === "independently_replayed") && !e.verification.reference) reasons.push("verification_reference_missing");
    const s = e.source, policy = s ? policies.get(s.sourceId) : undefined;
    if (!s || !policy) reasons.push("source_unknown");
    if (policy) {
      if (policy.state !== "reviewed") reasons.push("source_disabled");
      if (policy.providerId !== s!.providerId) reasons.push("provider_identity_mismatch");
      if (policy.origin !== e.origin) reasons.push("source_origin_mismatch");
      if (policy.origin === "synthetic_fixture") reasons.push("synthetic_not_live_evidence");
      if (!policy.methods.includes(s!.method)) reasons.push("retrieval_method_not_reviewed");
      const asset = doc.asset.asset;
      const scope = asset.kind === "listed_equity" ? `market:${asset.mic}` : asset.kind === "unknown" ? null : asset.chain;
      if (asset.kind === "unknown" || !policy.assetKinds.includes(asset.kind) || !scope || !policy.chains.includes(scope)) reasons.push("source_coverage_mismatch");
      reasons.push(...rightsReasons(policy.rights, policy.entitlement, context, "policy"));
    }
    if (s) {
      reasons.push(...rightsReasons(s.rights, s.entitlement, context, "record"));
      if ((s.method === "rpc" || s.method === "websocket") && !["finalized_reported", "finalized_independently_verified"].includes(e.verification.finality)) reasons.push("finality_not_established");
    }
    const asset = doc.asset.asset;
    const expectedChain = asset.kind === "solana_mint" || asset.kind === "evm_token" ? asset.chain : null;
    if (e.coverage.chain !== expectedChain) reasons.push("coverage_chain_mismatch");
    if (e.coverage.kind === "unknown") reasons.push("coverage_unknown");
    if (e.coverage.kind === "interval" && (!e.coverage.from || !e.coverage.to)) reasons.push("interval_bounds_missing");
    if (e.coverage.kind !== "interval" && (e.coverage.from || e.coverage.to)) reasons.push("interval_kind_mismatch");
    const clocks = e.clocks;
    let freshness: EvidenceAssessment["freshness"] = "unknown";
    if (clocks.observedClock === "unknown") reasons.push("source_clock_unverified");
    if (!clocks.observedAt || !clocks.receivedAt) reasons.push("observation_clock_missing");
    const times = [clocks.observedAt, clocks.receivedAt, clocks.reportedAt, e.coverage.from, e.coverage.to].filter((t): t is string => t !== null);
    const invalidClock = times.some(t => nanos(t) > now)
      || !!(clocks.observedAt && clocks.receivedAt && nanos(clocks.observedAt) > nanos(clocks.receivedAt))
      || !!(clocks.reportedAt && clocks.receivedAt && nanos(clocks.reportedAt) > nanos(clocks.receivedAt))
      || !!(e.coverage.from && e.coverage.to && nanos(e.coverage.from) > nanos(e.coverage.to))
      || !!(e.coverage.to && clocks.observedAt && nanos(e.coverage.to) > nanos(clocks.observedAt));
    if (invalidClock) { freshness = "invalid_clock"; reasons.push("invalid_clock_order_or_future"); }
    else if (clocks.observedAt && clocks.receivedAt && e.maxAgeSeconds !== null && policy) {
      const limit = BigInt(Math.min(e.maxAgeSeconds, policy.maxAgeSeconds)) * 1000000000n;
      // Retrieving an old interval today cannot make its covered period current.
      const freshnessClock = e.coverage.kind === "interval" && e.coverage.to ? e.coverage.to : clocks.observedAt;
      freshness = now - nanos(freshnessClock) <= limit ? "fresh" : "stale";
      if (freshness === "stale") reasons.push("observation_stale");
    } else reasons.push("freshness_unknown");
    const distinct = [...new Set(reasons)];
    const state: EvidenceAssessment["state"] = e.category === "fact" ? distinct.length ? "withheld" : "admissible_fact" : e.category;
    return { id: e.id, category: e.category, state, freshness, reasons: distinct };
  });
  const admissibleFactIds = assessments.filter(a => a.state === "admissible_fact").map(a => a.id);
  const ids = (category: EvidenceEntry["category"]) => doc.entries.filter(e => e.category === category).map(e => e.id);
  const unknownIds = doc.entries.filter((e, i) => e.unknowns.length || assessments[i].state === "withheld" || e.category === "unavailable").map(e => e.id);
  const planReasons: string[] = [];
  if (context.mode === "offline_fixture") planReasons.push("synthetic_not_live_evidence");
  if (doc.asset.state !== "exact_identifier") planReasons.push("identity_unresolved");
  if (!admissibleFactIds.length) planReasons.push("no_admissible_source_facts");
  if (unknownIds.length) planReasons.push("unresolved_evidence_unknowns");
  if (conflicted.size || ids("counterevidence").length) planReasons.push("counterevidence_requires_review");
  return { ok: true, value: {
    version: VERSION, mode: context.mode, intendedUse: context.intendedUse, evaluatedAt: context.evaluatedAt, assetKey: doc.asset.asset.assetKey, assetVerification: "not_verified", sourceGo: false,
    assessments, admissibleFactIds, userAssertionIds: ids("user_assertion"), hypothesisIds: ids("hypothesis"), counterevidenceIds: ids("counterevidence"), unavailableIds: ids("unavailable"), unknownIds,
    decisionAdmissibility: { PLAN: planReasons.length ? "withheld" : "evidence_component_only", WATCH: "recordable_without_source_evidence", PASS: "recordable_without_source_evidence", reasons: planReasons },
  } };
}
