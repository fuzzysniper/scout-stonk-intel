import "server-only";
import { projectHeliusCapture } from "../../v4-solana-facts/projection";
import type { SolanaFactProjectionV1 } from "../../v4-solana-facts/contract";
import { isExactPublicKey, strictJson } from "../../onchain-mint/validation";
import type { FixedRpcRead, GlobalLedgerPort, Lease, LedgerCommand, LedgerReply, MockPilotPorts, OwnerIdentity, Permit, Report } from "./contract";
import { BOUNDS } from "./policy";
import { data, prepareProfile, time } from "./profile";
import { response } from "./result";
import { boundedBody, dispose, inspectResponse, need, Rejected, target } from "./transport";

const DENIALS = new Set(["stopped", "busy", "exhausted", "read_limited", "expired", "invalid_clock"]);
const HEX = /^[0-9a-f]{64}$/;
const REASONS = new Set(["disabled", "invalid_profile", "invalid_request", "unauthenticated", "ledger_unavailable", "missing_key", "stopped", "busy", "exhausted", "read_limited", "expired", "invalid_clock", "uncertain", "stale_source", "timeout", "rate_limited", "access_denied", "invalid_response", "response_too_large", "upstream_unavailable"]);
/** Internal injected harness only. No env/key lookup/native I/O/production constructor is provided. */
export function injectedMockPilot(profileInput: unknown, ports: MockPilotPorts, deadlineMs: number) {
  if (process.env.NODE_ENV !== "test") return async () => response("disabled", 503, null, false);
  const prepared = prepareProfile(profileInput);
  if (!prepared || !Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > BOUNDS.timeoutMs) return async () => response("invalid_profile");
  const { profile: p, hash } = prepared;
  let terminal = false, highestAttempt = 0;
  const permits = new Set<string>();
  const cache = new Map<string, { value: SolanaFactProjectionV1; at: number }>();
  return async (request: Request): Promise<Response> => {
    if (process.env.NODE_ENV !== "test") return response("disabled", 503, null, false);
    if (terminal) return response("stopped");
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined, ledger: GlobalLedgerPort | undefined, owner: OwnerIdentity | undefined, read: FixedRpcRead | undefined;
    let wall = 0, mono = 0, firstMono: number | undefined, haltSent = false;
    const clock = () => {
      const w = ports.now(), m = ports.monotonic();
      need(time(w) && Number.isFinite(m) && m >= 0, "invalid_clock");
      if (wall || mono) need(w >= wall && m >= mono && Math.abs(w - wall - (m - mono)) <= 1000, "invalid_clock");
      firstMono ??= m;
      need(m - firstMono <= deadlineMs, "timeout");
      wall = w; mono = m;
      need(w >= p.startsAt && w < p.expiresAt, "expired");
      need(!controller.signal.aborted, "timeout"); return w;
    };
    const halt = () => {
      terminal = true; cache.clear(); controller.abort();
      if (haltSent) return; haltSent = true;
      // Best effort only: no retry or assumption this ACK succeeded. The unresolved durable lease MUST remain blocking.
      if (ledger && owner) void Promise.resolve().then(() => ledger!.transact({ kind: "stop", policyHash: hash, ownerSubject: owner!.subject, reason: "uncertain", now: wall })).catch(() => undefined);
    };
    const call = async (command: LedgerCommand): Promise<LedgerReply> => {
      need(ledger, "ledger_unavailable");
      const reply = await ledger.transact(command); clock();
      need(data(reply, ["kind"], ["reason", "permit", "lease", "policyHash", "permitId", "leaseId", "report", "committedAt"]), "ledger_unavailable");
      if (reply.kind === "denied") {
        need(data(reply, ["kind", "reason"]) && DENIALS.has(reply.reason), "ledger_unavailable");
        throw new Rejected(reply.reason);
      }
      return reply;
    };
    const onAbort = () => halt();
    if (!request.signal.aborted) request.signal.addEventListener("abort", onAbort, { once: true });
    const work = async () => {
      need(!request.signal.aborted, "invalid_request");
      clock();
      // Absent trusted identity/global state is detected BEFORE any provider key read.
      need(ports.identity, "unauthenticated"); need(ports.ledger?.scope === "global_atomic_durable", "ledger_unavailable");
      ledger = ports.ledger;
      const u = new URL(request.url);
      need(request.method === "POST" && u.origin === p.origin && u.pathname === "/api/v4/helius-pilot" && !u.search && !u.hash && !u.username && !u.password, "invalid_request");
      need(request.headers.get("origin") === p.origin && request.headers.get("sec-fetch-site") === "same-origin", "unauthenticated");
      need(!request.headers.has("purpose") && !request.headers.has("sec-purpose") && (!request.headers.has("sec-fetch-dest") || request.headers.get("sec-fetch-dest") === "empty"), "invalid_request");
      need(!["x-api-key", "x-rpc-url", "helius-api-key", "content-encoding"].some(k => request.headers.has(k)), "invalid_request");
      need(["host", "x-forwarded-host"].every(k => !request.headers.has(k) || request.headers.get(k) === u.host), "unauthenticated");
      need(!request.headers.has("x-forwarded-proto") || request.headers.get("x-forwarded-proto") === "https", "unauthenticated");
      let headers = 0; request.headers.forEach((v, k) => { headers += new TextEncoder().encode(v + k).byteLength + 4; });
      need(headers <= BOUNDS.headerBytes && /^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") ?? ""), "invalid_request");
      const intent = request.headers.get("x-unfarmd-v4-pilot-intent"); need(intent === "read" || intent === "stop", "invalid_request");
      const resolved = await ports.identity.authenticate(request); const t = clock();
      need(data(resolved, ["subject", "issuer", "audience", "sessionId", "pilotId", "authenticatedAt", "expiresAt"]), "unauthenticated");
      // Snapshot trusted identity values; never infer identity from caller headers or a protection badge.
      need(resolved.subject === p.ownerSubject && resolved.issuer === p.identityIssuer && resolved.audience === p.origin && resolved.pilotId === p.id
        && typeof resolved.sessionId === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(resolved.sessionId)
        && time(resolved.authenticatedAt) && resolved.authenticatedAt >= p.startsAt && resolved.authenticatedAt <= t
        && time(resolved.expiresAt) && resolved.expiresAt > t && resolved.expiresAt <= p.expiresAt, "unauthenticated");
      owner = Object.freeze({ ...resolved }) as OwnerIdentity;
      const length = request.headers.get("content-length");
      need(length === null || /^\d{1,6}$/.test(length) && Number(length) <= BOUNDS.requestBytes, "invalid_request");
      let body: unknown;
      try {
        const text = await boundedBody(new Response(request.body), controller.signal, BOUNDS.requestBytes); clock();
        body = strictJson(text);
      } catch (error) {
        if (controller.signal.aborted || error instanceof Rejected && ["timeout", "invalid_clock", "expired"].includes(error.reason)) throw error;
        throw new Rejected("invalid_request");
      }
      if (intent === "stop") {
        need(data(body, ["action"]) && body.action === "stop", "invalid_request");
        const stopped = await call({ kind: "stop", policyHash: hash, ownerSubject: owner.subject, reason: "owner_stop", now: clock() });
        need(data(stopped, ["kind", "policyHash"]) && stopped.kind === "stopped" && stopped.policyHash === hash, "ledger_unavailable");
        terminal = true; cache.clear(); return response("stopped", 200);
      }
      need(data(body, ["action", "mint"]) && body.action === "read" && isExactPublicKey(body.mint) && p.mints.includes(body.mint), "invalid_request");
      const mint = body.mint;
      const admitted = await call({ kind: "admit", policyHash: hash, ownerSubject: owner.subject, mint, now: clock() });
      need(data(admitted, ["kind", "permit"]) && admitted.kind === "permit" && data(admitted.permit, ["policyHash", "id", "ownerSubject", "mint", "admittedAt"]), "ledger_unavailable");
      const value = admitted.permit;
      need(value.policyHash === hash && value.ownerSubject === owner.subject && value.mint === mint
        && typeof value.id === "string" && /^read-(?:[1-9]|[12][0-9]|30)$/.test(value.id) && !permits.has(value.id)
        && time(value.admittedAt) && value.admittedAt >= p.startsAt && value.admittedAt <= clock(), "ledger_unavailable");
      const permit: Permit = Object.freeze({ ...value }) as Permit; permits.add(permit.id);
      const finish = async (observation: SolanaFactProjectionV1, lease: Lease | null) => {
        const s = observation.provenance; need(s && observation.requestedMint === mint && observation.sourceGo === false && s.captureKind === "synthetic_fixture");
        const now = clock(), at = Date.parse(s.responseReceivedAt);
        need(time(at) && at <= now && now - at <= BOUNDS.sourceAgeMs && HEX.test(s.responseSha256) && /^[1-9]\d{0,15}$/.test(s.contextSlot));
        const report: Report = Object.freeze({ responseSha256: s.responseSha256, contextSlot: s.contextSlot, receivedAt: at });
        const published = await call({ kind: "finish", permit, lease, report, now });
        need(data(published, ["kind", "policyHash", "permitId", "leaseId", "report", "committedAt"]) && published.kind === "published"
          && published.policyHash === hash && published.permitId === permit.id && published.leaseId === (lease?.id ?? null)
          && data(published.report, ["responseSha256", "contextSlot", "receivedAt"])
          && published.report.responseSha256 === report.responseSha256 && published.report.contextSlot === report.contextSlot && published.report.receivedAt === report.receivedAt
          && time(published.committedAt) && published.committedAt >= now && published.committedAt <= clock(), "ledger_unavailable");
        return response(null, 200, observation);
      };
      // TTL is a serving limit, never a promise of physical erasure from process memory/host snapshots.
      const cached = cache.get(mint), now = clock();
      if (cached && now - cached.at <= BOUNDS.cacheMs && now >= cached.at) {
        const copy = structuredClone(cached.value);
        const observation = { ...copy, provenance: { ...copy.provenance!, evaluatedAt: new Date(now).toISOString() } };
        return await finish(observation, null);
      }
      cache.delete(mint);
      need(ports.readProviderKey && ports.transport, "missing_key");
      const key = ports.readProviderKey(); need(typeof key === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(key), "missing_key");
      const reserved = await call({ kind: "reserve", permit, now: clock() });
      need(data(reserved, ["kind", "lease"]) && reserved.kind === "lease" && data(reserved.lease, ["policyHash", "permitId", "id", "mint", "issuedAt", "expiresAt", "attemptsReserved", "creditsReserved"]), "ledger_unavailable");
      const l = reserved.lease;
      need(l.policyHash === hash && l.permitId === permit.id && l.mint === mint && Number.isSafeInteger(l.id) && l.id > highestAttempt && l.id <= BOUNDS.attempts
        && l.attemptsReserved === l.id && l.creditsReserved === l.id * p.creditsPerAttempt && l.creditsReserved <= p.maxCredits
        && time(l.issuedAt) && l.issuedAt >= permit.admittedAt && l.issuedAt <= clock() && time(l.expiresAt)
        && l.expiresAt === Math.min(l.issuedAt + BOUNDS.timeoutMs, p.expiresAt) && clock() < l.expiresAt, "ledger_unavailable");
      const lease: Lease = Object.freeze({ ...l }); highestAttempt = lease.id;
      const start = clock();
      read = Object.freeze({ target: target(key), method: "getAccountInfo", encoding: "jsonParsed", commitment: "finalized", mint, id: lease.id });
      const incoming = await ports.transport(read, controller.signal); clock();
      need(!controller.signal.aborted, "timeout");
      if (incoming.status !== 200) {
        void incoming.body?.cancel().catch(() => undefined);
        throw new Rejected(incoming.status === 429 ? "rate_limited" : incoming.status === 401 || incoming.status === 403 ? "access_denied" : "upstream_unavailable");
      }
      inspectResponse(incoming, read);
      const httpDate = incoming.headers.get("date");
      const raw = await boundedBody(incoming, controller.signal, BOUNDS.responseBytes), received = clock();
      need(!raw.includes(key) && !JSON.stringify(strictJson(raw)).includes(key));
      // The injected constructor can ONLY produce explicitly synthetic offline evidence.
      const observation = await projectHeliusCapture(mint, { kind: "synthetic_fixture",
        request: { network: "solana-mainnet", endpointHost: BOUNDS.host, method: read.method, encoding: read.encoding, commitment: read.commitment, mint, id: read.id },
        requestStartedAt: new Date(start).toISOString(), responseReceivedAt: new Date(received).toISOString(), evaluatedAt: new Date(clock()).toISOString(),
        httpStatus: 200, httpDate, text: raw }); clock();
      if (!observation.provenance || !observation.observations) throw new Rejected(observation.reason === "stale_source" ? "stale_source" : observation.reason === "invalid_clock" ? "invalid_clock" : observation.reason === "timeout" ? "timeout" : "invalid_response");
      need(!JSON.stringify(observation).includes(key));
      const out = await finish(observation, lease);
      if (cache.size >= BOUNDS.cacheEntries) cache.delete(cache.keys().next().value!);
      cache.set(mint, { value: observation, at: received });
      return out;
    };
    try {
      return await Promise.race([work(), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { halt(); reject(new Rejected("timeout")); }, deadlineMs);
      })]);
    } catch (error) {
      const reason = error instanceof Rejected && REASONS.has(error.reason) ? error.reason : "uncertain";
      if (!["invalid_request", "unauthenticated", "missing_key", "busy", "exhausted", "read_limited", "expired", "stopped"].includes(reason)) halt();
      const status = reason === "unauthenticated" ? 403 : reason === "invalid_request" ? 400 : ["busy", "exhausted", "read_limited"].includes(reason) ? 429 : 503;
      return response(reason, status);
    } finally { clearTimeout(timer); request.signal.removeEventListener("abort", onAbort); controller.abort(); if (read) dispose(read); }
  };
}
