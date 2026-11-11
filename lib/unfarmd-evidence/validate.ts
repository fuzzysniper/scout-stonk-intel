import { VERSION, type AssetResolution, type EvidenceDocument, type EvidenceEntry, type EvidenceSource, type EvaluationContext, type Rights, type Entitlement, type SourcePolicy, type ValidationResult } from "./contract";
import { isAssetKey, resolveAssetIdentity } from "./identity";
import { age, array, attempt, clock, enumeration, fail, object, optionalClock, reference, text, token, unique } from "./primitives";
const uses = ["private_research", "public_display", "commercial_reporting"] as const;
function rights(v: unknown, p: string): Rights {
  const r = object(v, p, ["status", "uses", "retention", "reference"]);
  return { status: enumeration(r.status, `${p}.status`, ["permitted", "unverified", "restricted", "denied"]), uses: unique(array(r.uses, `${p}.uses`, (x, path) => enumeration(x, path, uses), 3), `${p}.uses`), retention: enumeration(r.retention, `${p}.retention`, ["permitted", "unverified", "prohibited"]), reference: reference(r.reference, `${p}.reference`) };
}
function entitlement(v: unknown, p: string): Entitlement {
  const r = object(v, p, ["status", "reference"]);
  return { status: enumeration(r.status, `${p}.status`, ["authorized", "unverified", "denied"]), reference: reference(r.reference, `${p}.reference`) };
}
function key(v: unknown, p: string): string {
  if (!isAssetKey(v)) fail(p, "invalid_asset_key");
  return v;
}
function resolution(v: unknown, p: string): AssetResolution {
  const r = object(v, p, ["state", "inputOrigin", "verification", "asset", "reasons"]);
  const state = enumeration(r.state, `${p}.state`, ["exact_identifier", "ambiguous", "unsupported", "conflicting_hints", "invalid"]);
  const a = object(r.asset, `${p}.asset`, ["kind", "chain", "address", "enteredAddress", "assetKey", "mic", "ticker", "permanence"]);
  let canonical: AssetResolution;
  if (a.kind === "solana_mint") {
    object(a, `${p}.asset`, ["kind", "chain", "address", "assetKey"]);
    canonical = resolveAssetIdentity({ kind: a.kind, chain: a.chain, address: a.address });
  } else if (a.kind === "evm_token") {
    object(a, `${p}.asset`, ["kind", "chain", "address", "enteredAddress", "assetKey"]);
    canonical = resolveAssetIdentity({ kind: a.kind, chain: a.chain, address: a.enteredAddress });
    if (canonical.asset.kind !== "evm_token" || canonical.asset.address !== a.address) fail(p, "identity_key_mismatch");
  } else if (a.kind === "listed_equity") {
    object(a, `${p}.asset`, ["kind", "mic", "ticker", "assetKey", "permanence"]);
    if (a.permanence !== "listing_reference_not_permanent_security_id") fail(p, "invalid_equity_identity");
    canonical = resolveAssetIdentity({ kind: a.kind, mic: a.mic, ticker: a.ticker });
  } else {
    object(a, `${p}.asset`, ["kind", "ticker", "assetKey"]);
    if (a.kind !== "unknown" || a.assetKey !== null) fail(p, "invalid_unknown_identity");
    canonical = resolveAssetIdentity({ kind: "unknown", ticker: a.ticker });
    if (canonical.asset.kind !== "unknown" || canonical.asset.ticker !== a.ticker) fail(p, "invalid_unknown_identity");
  }
  if (canonical.asset.assetKey !== a.assetKey || (state === "exact_identifier") !== (canonical.state === "exact_identifier")) fail(p, "identity_key_mismatch");
  return { state, inputOrigin: enumeration(r.inputOrigin, `${p}.inputOrigin`, ["user_entered"]), verification: enumeration(r.verification, `${p}.verification`, ["not_verified"]), asset: canonical.asset, reasons: array(r.reasons, `${p}.reasons`, token, 16) };
}
function source(v: unknown, p: string): EvidenceSource | null {
  if (v === null) return null;
  const r = object(v, p, ["providerId", "sourceId", "method", "rights", "entitlement"]);
  return { providerId: token(r.providerId, `${p}.providerId`), sourceId: token(r.sourceId, `${p}.sourceId`), method: enumeration(r.method, `${p}.method`, ["manual", "http", "rpc", "websocket", "archive"]), rights: rights(r.rights, `${p}.rights`), entitlement: entitlement(r.entitlement, `${p}.entitlement`) };
}
function entry(v: unknown, p: string): EvidenceEntry {
  const r = object(v, p, ["id", "assetKey", "category", "subject", "statement", "quantity", "origin", "representation", "derivedFrom", "contradicts", "source", "clocks", "coverage", "verification", "reference", "maxAgeSeconds", "unknowns"]);
  const c = object(r.clocks, `${p}.clocks`, ["observedAt", "receivedAt", "reportedAt", "observedClock"]);
  const coverage = object(r.coverage, `${p}.coverage`, ["kind", "chain", "from", "to", "exhaustive"]);
  if (coverage.exhaustive !== false) fail(`${p}.coverage`, "exhaustive_coverage_unsupported");
  const verification = object(r.verification, `${p}.verification`, ["tier", "finality", "reference"]);
  let quantity: EvidenceEntry["quantity"] = null;
  if (r.quantity !== null) {
    const q = object(r.quantity, `${p}.quantity`, ["raw", "decimals", "unitAssetKey"]);
    if (typeof q.raw !== "string" || !/^(?:0|-?[1-9][0-9]{0,77})$/.test(q.raw)) fail(`${p}.quantity.raw`, "invalid_exact_integer");
    if (!Number.isSafeInteger(q.decimals) || (q.decimals as number) < 0 || (q.decimals as number) > 30) fail(`${p}.quantity.decimals`, "invalid_decimal_precision");
    quantity = { raw: q.raw, decimals: q.decimals as number, unitAssetKey: key(q.unitAssetKey, `${p}.quantity.unitAssetKey`) };
  }
  const e: EvidenceEntry = {
    id: token(r.id, `${p}.id`), assetKey: r.assetKey === null ? null : key(r.assetKey, `${p}.assetKey`),
    category: enumeration(r.category, `${p}.category`, ["fact", "user_assertion", "hypothesis", "counterevidence", "unavailable"]),
    subject: token(r.subject, `${p}.subject`), statement: text(r.statement, `${p}.statement`), quantity,
    origin: enumeration(r.origin, `${p}.origin`, ["source_record", "user_entry", "synthetic_fixture"]),
    representation: enumeration(r.representation, `${p}.representation`, ["raw", "derived"]),
    derivedFrom: unique(array(r.derivedFrom, `${p}.derivedFrom`, token, 32), `${p}.derivedFrom`),
    contradicts: unique(array(r.contradicts, `${p}.contradicts`, token, 32), `${p}.contradicts`), source: source(r.source, `${p}.source`),
    clocks: { observedAt: optionalClock(c.observedAt, `${p}.clocks.observedAt`), receivedAt: optionalClock(c.receivedAt, `${p}.clocks.receivedAt`), reportedAt: optionalClock(c.reportedAt, `${p}.clocks.reportedAt`), observedClock: enumeration(c.observedClock, `${p}.clocks.observedClock`, ["unknown", "provider_reported", "corroborated"]) },
    coverage: { kind: enumeration(coverage.kind, `${p}.coverage.kind`, ["point_in_time", "interval", "partial_sample", "unknown"]), chain: coverage.chain === null ? null : token(coverage.chain, `${p}.coverage.chain`), from: optionalClock(coverage.from, `${p}.coverage.from`), to: optionalClock(coverage.to, `${p}.coverage.to`), exhaustive: false },
    verification: { tier: enumeration(verification.tier, `${p}.verification.tier`, ["unverified", "provider_reported", "corroborated", "independently_replayed"]), finality: enumeration(verification.finality, `${p}.verification.finality`, ["unknown", "provisional", "finalized_reported", "finalized_independently_verified", "not_applicable"]), reference: reference(verification.reference, `${p}.verification.reference`) },
    reference: reference(r.reference, `${p}.reference`), maxAgeSeconds: r.maxAgeSeconds === null ? null : age(r.maxAgeSeconds, `${p}.maxAgeSeconds`), unknowns: unique(array(r.unknowns, `${p}.unknowns`, token, 32), `${p}.unknowns`),
  };
  if (e.origin === "user_entry" && e.category === "fact") fail(p, "user_assertion_is_not_verified_fact");
  if (e.category === "unavailable" && quantity !== null) fail(p, "unavailable_has_no_quantity");
  if (e.representation === "raw" && e.derivedFrom.length || e.representation === "derived" && !e.derivedFrom.length) fail(p, "invalid_derivation_links");
  if (e.verification.finality === "finalized_independently_verified" && e.verification.tier !== "independently_replayed") fail(p, "finality_assurance_mismatch");
  if (e.verification.tier === "independently_replayed" && !e.verification.reference) fail(p, "replay_reference_required");
  return e;
}
export function validateEvidence(input: unknown): ValidationResult<EvidenceDocument> {
  return attempt(() => {
    const r = object(input, "$", ["version", "asset", "entries"]);
    const version = enumeration(r.version, "$.version", [VERSION]);
    const asset = resolution(r.asset, "$.asset");
    const entries = array(r.entries, "$.entries", entry);
    unique(entries.map(e => e.id), "$.entries");
    const byId = new Map(entries.map(e => [e.id, e]));
    for (const e of entries) {
      for (const id of [...e.derivedFrom, ...e.contradicts]) {
        const target = byId.get(id);
        if (!target || id === e.id || target.assetKey !== e.assetKey) fail("$.entries", "invalid_evidence_link");
      }
      for (const id of e.contradicts) if (byId.get(id)!.subject !== e.subject) fail("$.entries", "contradiction_subject_mismatch");
    }
    const visited = new Set<string>(), visiting = new Set<string>();
    function visit(e: EvidenceEntry): void {
      if (visiting.has(e.id)) fail("$.entries", "cyclic_derivation");
      if (visited.has(e.id)) return;
      visiting.add(e.id);
      e.derivedFrom.forEach(id => visit(byId.get(id)!));
      visiting.delete(e.id); visited.add(e.id);
    }
    entries.forEach(visit);
    return { version, asset, entries };
  });
}
function policy(v: unknown, p: string): SourcePolicy {
  const r = object(v, p, ["providerId", "sourceId", "state", "origin", "assetKinds", "chains", "methods", "rights", "entitlement", "maxAgeSeconds"]);
  return {
    providerId: token(r.providerId, `${p}.providerId`), sourceId: token(r.sourceId, `${p}.sourceId`), state: enumeration(r.state, `${p}.state`, ["disabled", "reviewed"]), origin: enumeration(r.origin, `${p}.origin`, ["source_record", "synthetic_fixture"]),
    assetKinds: unique(array(r.assetKinds, `${p}.assetKinds`, (x, path) => enumeration(x, path, ["solana_mint", "evm_token", "listed_equity"]), 3), p),
    chains: unique(array(r.chains, `${p}.chains`, token, 32), p), methods: unique(array(r.methods, `${p}.methods`, (x, path) => enumeration(x, path, ["manual", "http", "rpc", "websocket", "archive"]), 5), p),
    rights: rights(r.rights, `${p}.rights`), entitlement: entitlement(r.entitlement, `${p}.entitlement`), maxAgeSeconds: age(r.maxAgeSeconds, `${p}.maxAgeSeconds`),
  };
}
export function validateContext(input: unknown): ValidationResult<EvaluationContext> {
  return attempt(() => {
    const r = object(input, "$context", ["evaluatedAt", "mode", "intendedUse", "sourcePolicies"]);
    const policies = r.sourcePolicies === undefined ? [] : array(r.sourcePolicies, "$context.sourcePolicies", policy, 32);
    unique(policies.map(p => p.sourceId), "$context.sourcePolicies");
    return { evaluatedAt: clock(r.evaluatedAt, "$context.evaluatedAt"), mode: enumeration(r.mode, "$context.mode", ["offline_fixture", "record_review"]), intendedUse: enumeration(r.intendedUse, "$context.intendedUse", uses), sourcePolicies: policies };
  });
}
