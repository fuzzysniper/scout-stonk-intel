import type { SourceReceipt } from "./contract";
import type { CandidateReview, Rejection, ReviewIdentity, ReviewOptions } from "./expansion-contract";
import { EXPANSION_CANDIDATES, OFFLINE_LIMITS, RIGHTS_BLOCKERS, subjectPaths } from "./expansion-catalog";
import { EXPANSION_RETAINED } from "./expansion-retained";
import { CAPTURE, ORIGIN } from "./catalog";
import { freeze, isExactSolanaMint, utcMicros } from "./guards";

export { evaluateFreshnessTranscript } from "./freshness";
export type { CandidateReview, FreshnessTranscript, TranscriptReceipt, TranscriptReview, ReviewIdentity, ReviewOptions } from "./expansion-contract";

export function listExpansionCandidates(): readonly ReviewIdentity[] { return EXPANSION_CANDIDATES; }

function result(state: CandidateReview["state"], reason: Rejection | null = null, evidence: CandidateReview["evidence"] = null): CandidateReview {
  return freeze({ schemaVersion: "consumer-expansion/1", activation: "disabled", state, reason,
    requestsMade: 0, publicExplanation: null, financialQuantities: null, holderReturn: null,
    blockers: [...RIGHTS_BLOCKERS], evidence });
}

/** Separate offline review API. Never returns a supported/public explanation. */
export function reviewExpansionCandidate(mint: string, options?: ReviewOptions): CandidateReview {
  if (options?.offlineReview !== true) return result("inactive");
  if (!isExactSolanaMint(mint)) return result("unsupported", "invalid_mint");
  const identity = EXPANSION_CANDIDATES.find(c => c.mint === mint);
  if (!identity) return result("unsupported", "not_a_reviewed_subject");
  const now = utcMicros(options.asOf);
  if (now === null) return result("rejected", "invalid_clock");
  const matches = EXPANSION_RETAINED.filter(c => c.mint === mint && c.quoteMint === identity.quoteMint);
  if (matches.length !== 1 || matches[0].sources.length !== 3) return result("rejected", "evidence_integrity");
  const paths = subjectPaths(identity), indexes = [0, identity.catalogPacket, identity.rewardsPacket];
  const kinds = ["quote_registry", "pair_catalog", "reward_settings"] as const;
  const sources: SourceReceipt[] = [];
  for (let i = 0; i < 3; i++) {
    const s: SourceReceipt = matches[0].sources[i];
    if (s.url !== ORIGIN + paths[i] || s.kind !== kinds[i] || s.provider !== "StonkFun" ||
        !/^[a-f0-9]{64}$/.test(s.bodySha256) || s.id !== `capture-${indexes[i]}-${s.bodySha256}` ||
        s.evidence !== "retained_capture" || s.verification !== "provider_identity_at_capture" ||
        s.rights.permission !== "unverified" || s.rights.financialQuantities !== "withheld" || s.rights.publication !== "metadata_only" ||
        s.retained?.commit !== CAPTURE.commit || s.retained.path !== CAPTURE.path || s.retained.documentSha256 !== CAPTURE.documentSha256 || s.retained.packetIndex !== indexes[i]) return result("rejected", "evidence_integrity");
    const captured = utcMicros(s.capturedAt), generated = utcMicros(s.generatedAt);
    if (captured === null || generated === null || generated > captured || captured - generated > 600000000n) return result("rejected", "evidence_integrity");
    if (captured > now) return result("rejected", "invalid_clock");
    sources.push({ id: s.id, kind: kinds[i], provider: "StonkFun", url: s.url,
      capturedAt: s.capturedAt, generatedAt: s.generatedAt, bodySha256: s.bodySha256,
      evidence: "retained_capture", verification: "provider_identity_at_capture",
      rights: { publication: "metadata_only", financialQuantities: "withheld", permission: "unverified" },
      retained: { ...CAPTURE, packetIndex: indexes[i] } });
  }
  const stale = sources.some(s => now - utcMicros(s.generatedAt)! > BigInt(OFFLINE_LIMITS.maxAgeSeconds) * 1000000n || now - utcMicros(s.capturedAt)! > BigInt(OFFLINE_LIMITS.maxAgeSeconds) * 1000000n);
  return result("blocked", null, {
    identity: { ...identity }, identityStatus: "provider_verified_at_capture", currentMechanism: "not_verified",
    publication: "not_authorized", evaluatedAt: options.asOf, freshness: stale ? "stale" : "captured", sources,
  });
}
