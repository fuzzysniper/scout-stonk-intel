import type { Rejection, ReviewOptions, TranscriptReceipt, TranscriptReview } from "./expansion-contract";
import { REVIEW_SUBJECTS, OFFLINE_LIMITS, subjectPaths } from "./expansion-catalog";
import { freeze, isExactSolanaMint, utcMicros } from "./guards";
import { decodeIdentityBody, need, ReviewRejected, verifyIdentityBodies } from "./identity-review";

function result(state: TranscriptReview["state"], reason: Rejection | null = null, evidence: TranscriptReview["evidence"] = null): TranscriptReview {
  return freeze({ schemaVersion: "consumer-expansion/1", activation: "disabled", state, reason,
    requestsMade: 0, retryAllowed: false, publication: "not_authorized", currentMechanism: "not_live_verified",
    financialQuantities: null, holderReturn: null, economicEpoch: "unknown", continuity: "not_established", evidence });
}

function utf8Bytes(text: string): number {
  let size = 0;
  for (const c of text) { const n = c.codePointAt(0)!; size += n < 128 ? 1 : n < 2048 ? 2 : n < 65536 ? 3 : 4; }
  return size;
}

/** Transport-free rehearsal, off by default. An offline flag never enables requests or support. */
export function evaluateFreshnessTranscript(mint: string, transcript: unknown, options?: ReviewOptions): TranscriptReview {
  if (options?.offlineReview !== true) return result("inactive");
  if (!isExactSolanaMint(mint)) return result("unsupported", "invalid_mint");
  const subject = REVIEW_SUBJECTS.find(s => s.mint === mint);
  if (!subject) return result("unsupported", "not_a_reviewed_subject");
  try {
    const now = utcMicros(options.asOf); need(now !== null, "invalid_clock");
    need(transcript && typeof transcript === "object" && !Array.isArray(transcript), "transcript_version");
    const input = transcript as { version?: unknown; kind?: unknown; receipts?: unknown };
    need(input.version === "stonkfun-identity-transcript/1" && input.kind === "offline_transcript", "transcript_version");
    need(Array.isArray(input.receipts) && input.receipts.length === OFFLINE_LIMITS.requests, "request_budget");
    const paths = subjectPaths(subject), limits = [OFFLINE_LIMITS.registryBytes, OFFLINE_LIMITS.catalogBytes, OFFLINE_LIMITS.rewardBytes];
    let bytes = 0, firstStart = 0n, previousCapture = 0n;
    const bodies: unknown[] = [], packets: TranscriptReceipt[] = [];
    for (let i = 0; i < input.receipts.length; i++) {
      const p = input.receipts[i] as TranscriptReceipt | null;
      need(p && typeof p === "object" && p.path === paths[i] && p.responsePath === paths[i], "source_mismatch");
      need(p.outcome !== "timeout", "timeout");
      need(p.outcome === "response", "source_unavailable");
      need(p.status !== 429, "rate_limited"); need(p.status === 200, "source_unavailable");
      need(p.headers && typeof p.headers === "object" && !Array.isArray(p.headers), "transport");
      const headerNames = Object.keys(p.headers);
      need(headerNames.every(k => k === k.toLowerCase()) && !headerNames.some(k => ["link", "content-range", "location", "refresh"].includes(k)), "transport");
      need(typeof p.headers["content-type"] === "string" && /^application\/json(?:\s*;.*)?$/i.test(p.headers["content-type"]), "transport");
      for (const name of ["age", "source-age"]) {
        const age = p.headers[name]; need(age === undefined || typeof age === "string" && /^\d{1,6}$/.test(age) && Number(age) <= OFFLINE_LIMITS.maxAgeSeconds, "transport");
      }
      const start = utcMicros(p.startedAt), captured = utcMicros(p.capturedAt);
      need(start !== null && captured !== null && start <= captured && captured <= now && now - captured <= BigInt(OFFLINE_LIMITS.maxAgeSeconds) * 1000000n, "source_clock");
      need(captured - start <= BigInt(OFFLINE_LIMITS.requestMilliseconds) * 1000n, "deadline");
      if (i === 0) firstStart = start;
      else need(start >= previousCapture, "deadline");
      need(captured - firstStart <= BigInt(OFFLINE_LIMITS.batchMilliseconds) * 1000n, "deadline");
      previousCapture = captured;
      need(typeof p.body === "string" && p.body.length > 0 && p.body.length <= limits[i], "body_budget");
      const size = utf8Bytes(p.body); bytes += size;
      need(size <= limits[i] && bytes <= OFFLINE_LIMITS.totalBytes, "body_budget");
      bodies.push(decodeIdentityBody(p.body)); packets.push(p);
    }
    const generated = verifyIdentityBodies(bodies, subject);
    const sources = packets.map((p, i) => {
      const clock = utcMicros(generated[i]), captured = utcMicros(p.capturedAt)!;
      need(clock !== null && clock <= captured && now - clock <= BigInt(OFFLINE_LIMITS.maxAgeSeconds) * 1000000n, "source_clock");
      return { path: paths[i], capturedAt: p.capturedAt, generatedAt: generated[i] };
    });
    return result("offline_validated", null, {
      mint: subject.mint, quoteMint: subject.quoteMint, poolMint: subject.poolMint,
      evaluatedAt: options.asOf, freshnessAtTranscriptClock: "within_budget",
      sourceAuthenticity: "not_attested", completeMarketCoverage: false, sources,
    });
  } catch (error) { return result("rejected", error instanceof ReviewRejected ? error.reason : "schema_drift"); }
}
