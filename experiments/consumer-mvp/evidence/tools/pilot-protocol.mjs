// Offline acceptance protocol, not an HTTP adapter. No I/O or trust root is installed.
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
if (!process.env.EVIDENCE_TEST_BUILD) throw new Error("offline_build_required");
const compiled = name => require(resolve(process.env.EVIDENCE_TEST_BUILD, name + ".js"));
const { IDENTITIES, ORIGIN } = compiled("catalog");
const { utcMicros, freeze } = compiled("guards");
const { evaluateFreshnessTranscript } = compiled("freshness");
export const PILOT_BOUNDARY = freeze({ version: "consumer-source-pilot/1", activation: "disabled", transport: null, liveRequests: 0 });
export const PILOT_LIMITS = freeze({ sessionRequests: 3, batchRequests: 3, concurrency: 1, minimumAdmissionSeconds: 60, cacheSeconds: 600, retries: 0, rawRetentionSeconds: 0 });
const FIELDS = ["tokenIdentity", "labels", "pair", "rewardMode", "provenance"];
export const digestBody = body => createHash("sha256").update(body, "utf8").digest("hex");
function result(state, reason = null, preview = null, lease = null) {
  return freeze({ ...PILOT_BOUNDARY, state, reason, requestsMade: 0, rightsVerified: false,
    sourceAuthenticity: "not_attested", providerSignatureVerified: false,
    publicExplanation: null, financialQuantities: null, holderReturn: null, preview, lease });
}
function policy(value, mint, now) {
  if (value?.kind !== "offline-policy-fixture/1") return "rights_unverified";
  const start = utcMicros(value.validFrom), end = utcMicros(value.validUntil);
  if (start === null || end === null || start > now || now >= end) return "rights_expired_or_invalid";
  if (value.mint !== mint || value.access !== true || value.transientProcessing !== true || value.rawRetentionSeconds !== 0 ||
      !Number.isInteger(value.metadataCacheSeconds) || value.metadataCacheSeconds < 0 || value.metadataCacheSeconds > 600 ||
      !Array.isArray(value.publicFields) || value.publicFields.length === 0 || new Set(value.publicFields).size !== value.publicFields.length ||
      !value.publicFields.every(f => FIELDS.includes(f))) return "rights_scope";
  return null;
}

/** A single in-memory simulated proof session. Cannot make calls or promote an explanation. */
export function createPilotRehearsal({ offlineReview = false } = {}) {
  let spent = 0, lastClock = null, lastAdmission = null, inflight = null, completed = false, circuit = null, cache = null;
  function clock(asOf) {
    const now = utcMicros(asOf);
    if (now === null || lastClock !== null && now < lastClock) return null;
    lastClock = now; return now;
  }
  function stop(reason) { circuit = reason; cache = null; inflight = null; return result("rejected", reason); }
  return Object.freeze({
    admit(mint, permissionFixture, asOf) {
      if (!offlineReview) return result("inactive");
      const now = clock(asOf); if (now === null) return stop("invalid_clock");
      const identity = IDENTITIES.find(i => i.mint === mint); if (!identity) return result("blocked", "not_in_default_three");
      const denied = policy(permissionFixture, mint, now);
      if (denied) { cache = null; inflight = null; circuit = denied; return result("blocked", denied); }
      if (circuit) return result("blocked", "circuit_open");
      // Bind cache/lease to all simulated permission scopes and expiry, not just a mint.
      const scope = { mint, validFrom: permissionFixture.validFrom, validUntil: permissionFixture.validUntil,
        access: true, transientProcessing: true, rawRetentionSeconds: 0,
        metadataCacheSeconds: permissionFixture.metadataCacheSeconds, publicFields: [...permissionFixture.publicFields].sort() };
      const scopeHash = digestBody(JSON.stringify(scope));
      if (inflight && inflight.scopeHash !== scopeHash) return stop("rights_scope_changed");
      if (cache && cache.scopeHash === scopeHash && now < cache.expires) return result("cache_hit", null, cache.preview);
      cache = null;
      if (inflight) return result("blocked", "inflight");
      if (lastAdmission !== null && now - lastAdmission < 60000000n) return result("blocked", "admission_cooldown");
      if (spent + 3 > PILOT_LIMITS.sessionRequests) return result("blocked", "session_budget");
      spent += 3; lastAdmission = now;
      inflight = { id: 1, identity, scope, scopeHash, admittedAt: now };
      return result("admitted", null, null, 1);
    },
    finish(lease, transcript, acquisitionFixture, asOf) {
      if (!offlineReview) return result("inactive");
      const now = clock(asOf); if (now === null) return stop("invalid_clock");
      if (!inflight || lease !== inflight.id) return completed ? stop("replay") : result("rejected", "invalid_lease");
      const grant = inflight; inflight = null; completed = true;
      if (now - grant.admittedAt > 9000000n) return stop("deadline");
      const denied = policy({ kind: "offline-policy-fixture/1", ...grant.scope }, grant.identity.mint, now);
      if (denied) return stop(denied);
      // Client assertions, unsigned uploads and historical hashes alone are never trusted.
      if (acquisitionFixture?.kind !== "offline-acquisition-fixture/1") return stop("unattested_source");
      if (acquisitionFixture.requestedOrigin !== ORIGIN || acquisitionFixture.finalOrigin !== ORIGIN ||
          acquisitionFixture.tlsVerified !== true || acquisitionFixture.redirects !== 0) return stop("source_origin");
      const checked = evaluateFreshnessTranscript(grant.identity.mint, transcript, { offlineReview: true, asOf });
      if (checked.state !== "offline_validated") return stop(checked.reason ?? "transcript_invalid");
      if (!Array.isArray(acquisitionFixture.bodySha256) || acquisitionFixture.bodySha256.length !== 3 ||
          !transcript.receipts.every((p, i) => acquisitionFixture.bodySha256[i] === digestBody(p.body))) return stop("receipt_integrity");
      // Receipt intervals must actually fall inside this simulated admission, not a prior run.
      if (transcript.receipts.some(p => utcMicros(p.startedAt) < grant.admittedAt || utcMicros(p.capturedAt) > now)) return stop("replay");
      const exactExpiry = [utcMicros(grant.scope.validUntil), now + BigInt(grant.scope.metadataCacheSeconds) * 1000000n,
        ...checked.evidence.sources.map(s => utcMicros(s.generatedAt) + 600000000n)].reduce((a, b) => a < b ? a : b);
      const expires = exactExpiry / 1000n * 1000n; // Round policy expiry down, never extend source life.
      const allowed = name => grant.scope.publicFields.includes(name), i = grant.identity;
      const preview = freeze({ use: "offline_fixture_only",
        tokenIdentity: allowed("tokenIdentity") ? { network: "solana", mint: i.mint } : null,
        labels: allowed("labels") ? { name: i.name, symbol: i.symbol } : null,
        pair: allowed("pair") ? { quoteMint: i.quoteMint, quoteSymbol: i.quoteSymbol, quoteDecimals: i.quoteDecimals, poolMint: i.poolMint } : null,
        rewardMode: allowed("rewardMode") ? "provider_reported_reward_setting" : null,
        provenance: allowed("provenance") ? checked.evidence.sources.map((s, index) => ({
          url: ORIGIN + s.path, generatedAt: s.generatedAt, capturedAt: s.capturedAt, bodySha256: acquisitionFixture.bodySha256[index],
        })) : null,
        expiresAt: new Date(Number(expires / 1000n)).toISOString(),
      });
      if (expires > now) cache = { scopeHash: grant.scopeHash, expires, preview };
      return result("offline_checked", null, preview);
    },
    status() { return freeze({ ...PILOT_BOUNDARY, simulatedRequestsReserved: spent, inflight: Boolean(inflight), circuit, cachePresent: Boolean(cache), resetAvailable: false }); },
  });
}
