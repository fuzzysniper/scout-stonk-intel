import 'server-only';
import type { OwnerBoundary, VerifiedOwnerContext } from '../v4-owner-ledger/contract';
import { validateReply } from '../v4-owner-ledger/commands';
import type { GlobalLedgerPort, LedgerCommand, LedgerReply, Permit, Lease, FixedRpcRead } from '../v4-helius-pilot/server/contract';
import { prepareProfile, time } from '../v4-helius-pilot/server/profile';
import { BOUNDS } from '../v4-helius-pilot/server/policy';
import { boundedBody, target, dispose, need, Rejected } from '../v4-helius-pilot/server/transport';
import { freeze, isExactPublicKey, strictJson } from '../onchain-mint/validation';
import { BoundaryError } from '../onchain-mint/server/rpc';
import { data } from '../v4-helius-pilot/server/profile';
import type { NativeProducer, NativeResult, NativeReason, NativeObservation } from './contract';
import { inspectBinding, type TransportBinding } from './transport';
import { acquire } from './capture';
import { NATIVE_SOURCE } from './index';
class NativeRejected extends Error { constructor(readonly reason: NativeReason) { super(reason); } }

export type ProducerPorts = Readonly<{
  owner: OwnerBoundary; ledger: GlobalLedgerPort; readProviderKey: () => unknown;
  now: () => number; monotonic: () => number;
}>;
export const grey = (reason: NativeReason): NativeResult => freeze({ version: 'unfarmd-helius-native/1', sourceGo: false, state: 'grey', reason, observation: null });
const NO_HALT = new Set(['invalid_request', 'unauthenticated', 'missing_key', 'busy', 'exhausted', 'read_limited', 'expired', 'stopped', 'disabled']);
/** Internal code-only producer. The only native binding is irreversibly OFF in this draft.
 * No second budget/cache ledger. One instance for the lifetime of the existing fenced PG adapter.
 */
export function prepareProducer(profileInput: unknown, ports: ProducerPorts, binding: TransportBinding, deadlineMs: number = BOUNDS.timeoutMs): NativeProducer {
  const prepared = prepareProfile(profileInput), bound = inspectBinding(binding);
  if (!prepared || !bound || !Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > BOUNDS.timeoutMs) return async () => grey('invalid_profile');
  const { profile: p, hash } = prepared;
  let terminal = false, active = false, stopping = false, highest = 0, lastWall = 0, lastMono = 0;
  let inFlight: AbortController | undefined;
  const permits = new Set<string>();
  let stopAttempt: Promise<unknown> | undefined;
  const stop = (reason: 'owner_stop' | 'uncertain', now: number) => {
    terminal = true;
    stopAttempt ??= Promise.resolve().then(() => ports.ledger.transact({ kind: 'stop', policyHash: hash, ownerSubject: p.ownerSubject, reason, now })).catch(() => undefined);
    return stopAttempt;
  };
  return async (request: Request) => {
    if (terminal) return grey('stopped');
    const stopIntent = request.headers.get('x-unfarmd-v4-pilot-intent') === 'stop';
    if (active && !stopIntent || stopping && stopIntent) return grey('busy');
    // Native OFF checked BEFORE auth, ledger, key, timer or any possible wire operation.
    if (bound.acquisition === 'production_rpc' && !NATIVE_SOURCE.enabled) return grey('disabled');
    const ownsActive = !active;
    if (ownsActive) active = true;
    if (stopIntent) stopping = true;
    const abort = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
    if (!stopIntent) inFlight = abort;
    let read: FixedRpcRead | undefined, context: VerifiedOwnerContext | null = null, knownOwner = false;
    let wall = 0, monoStart: number | undefined, lease: Lease | undefined;
    const clock = () => {
      const w = ports.now(), m = ports.monotonic();
      need(time(w) && Number.isFinite(m) && m >= 0, 'invalid_clock');
      need(w >= lastWall && m >= lastMono && (!lastWall || Math.abs(w - lastWall - (m - lastMono)) <= 1000), 'invalid_clock');
      lastWall = wall = w; lastMono = m; monoStart ??= m;
      need(!terminal && !abort.signal.aborted, 'timeout');
      need(m - monoStart <= deadlineMs, 'timeout');
      need(w >= p.startsAt && w < p.expiresAt, 'expired');
      if (lease) need(w < lease.expiresAt, 'expired');
      return w;
    };
    const halt = () => { terminal = true; abort.abort(); if (knownOwner) void stop('uncertain', wall); };
    const onAbort = () => halt(); request.signal.addEventListener('abort', onAbort, { once: true });
    const verify = async () => {
      const c = context ? await ports.owner.reverify(request, context) : await ports.owner.verify(request); const now = clock();
      need(c, 'unauthenticated'); const identity = ports.owner.inspect(c);
      need(identity && identity.ownerSubject === p.ownerSubject && identity.issuer === p.identityIssuer && identity.audience === p.origin
        && identity.authenticatedAt >= p.startsAt && identity.authenticatedAt <= now && identity.expiresAt > now && identity.expiresAt <= p.expiresAt, 'unauthenticated');
      context = c; knownOwner = true;
    };
    const transact = async (command: LedgerCommand): Promise<LedgerReply> => {
      need(ports.ledger?.scope === 'global_atomic_durable', 'ledger_unavailable');
      const raw = await ports.ledger.transact(command); clock();
      // Native adapter already validates; recheck closed correlated shape and detach before await.
      validateReply(raw, command); const reply = freeze(structuredClone(raw));
      if (reply.kind === 'denied') throw new Rejected(reply.reason);
      return reply;
    };
    const work = async (): Promise<NativeResult> => {
      clock(); need(!request.signal.aborted, 'invalid_request');
      const u = new URL(request.url);
      need(request.method === 'POST' && u.origin === p.origin && u.pathname === '/api/v4/helius-pilot' && !u.search && !u.hash, 'invalid_request');
      need(request.headers.get('origin') === p.origin && request.headers.get('sec-fetch-site') === 'same-origin', 'unauthenticated');
      need(!['purpose', 'sec-purpose', 'x-api-key', 'helius-api-key', 'x-rpc-url', 'content-encoding'].some(h => request.headers.has(h)), 'invalid_request');
      let size = 0; request.headers.forEach((v, k) => size += Buffer.byteLength(k + v) + 4);
      const length = request.headers.get('content-length');
      need(size <= BOUNDS.headerBytes && /^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '')
        && (length === null || /^\d{1,6}$/.test(length) && Number(length) <= BOUNDS.requestBytes), 'invalid_request');
      const intent = request.headers.get('x-unfarmd-v4-pilot-intent'); need(intent === 'read' || intent === 'stop', 'invalid_request');
      await verify();
      const text = await boundedBody(new Response(request.body), abort.signal, BOUNDS.requestBytes); clock();
      let body: unknown; try { body = strictJson(text); } catch { throw new Rejected('invalid_request'); }
      if (intent === 'stop') {
        need(data(body, ['action']) && body.action === 'stop', 'invalid_request');
        const command: LedgerCommand = { kind: 'stop', policyHash: hash, ownerSubject: p.ownerSubject, reason: 'owner_stop', now: clock() };
        const reply = await transact(command); need(reply.kind === 'stopped', 'ledger_unavailable'); terminal = true; inFlight?.abort(); return grey('stopped');
      }
      need(data(body, ['action', 'mint']) && body.action === 'read' && isExactPublicKey(body.mint) && p.mints.includes(body.mint), 'invalid_request');
      const mint = body.mint;
      const admitted = await transact({ kind: 'admit', policyHash: hash, ownerSubject: p.ownerSubject, mint, now: clock() });
      need(admitted.kind === 'permit' && !permits.has(admitted.permit.id), 'ledger_unavailable');
      const permit: Permit = admitted.permit; permits.add(permit.id);
      await verify();
      const key = ports.readProviderKey(); need(typeof key === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(key), 'missing_key');
      const reserved = await transact({ kind: 'reserve', permit, now: clock() }); need(reserved.kind === 'lease', 'ledger_unavailable');
      const l = reserved.lease;
      need(l.id > highest && l.id <= BOUNDS.attempts && l.attemptsReserved === l.id && l.creditsReserved === l.id * p.creditsPerAttempt
        && l.creditsReserved <= p.maxCredits && l.expiresAt === Math.min(l.issuedAt + BOUNDS.timeoutMs, p.expiresAt), 'ledger_unavailable');
      lease = l; highest = l.id; clock();
      await verify();
      read = Object.freeze({ target: target(key), method: 'getAccountInfo', encoding: 'jsonParsed', commitment: 'finalized', mint, id: lease.id });
      const facts = await acquire(binding, read, abort.signal, clock); clock();
      if (!facts.source || !facts.facts) {
        const reason = 'reason' in facts ? facts.reason : 'invalid_response';
        throw new BoundaryError(reason);
      }
      // Unknown/unreviewed Token-2022 behavior never becomes an admitted green observation.
      if (facts.status === 'unsupported_extensions') throw new NativeRejected('unreviewed_extensions');
      const s = facts.source;
      need(s.acquisition === bound.acquisition && s.contextSlot && Date.parse(s.responseReceivedAt) <= clock());
      await verify();
      const report = Object.freeze({ responseSha256: s.responseSha256, contextSlot: s.contextSlot, receivedAt: Date.parse(s.responseReceivedAt) });
      const committed = await transact({ kind: 'finish', permit, lease, report, now: clock() }); need(committed.kind === 'published', 'ledger_unavailable');
      // A valid finish ACK alone cannot override session revocation, timeout, STOP or expiry.
      await verify(); clock();
      const observation: NativeObservation = freeze({ facts, acquisition: bound.acquisition === 'synthetic_fixture' ? 'synthetic_fixture' : 'native_https_response',
        transportAuthentication: bound.acquisition === 'synthetic_fixture' ? 'local_fixture_only' : 'fixed_host_certificate_validated',
        requestBinding: 'server_request_not_echoed_by_account_response', assurance: 'rpc_reported_not_independently_replayed',
        policyHash: hash, permitId: permit.id, leaseId: lease.id, responseSha256: s.responseSha256, contextSlot: s.contextSlot,
        requestStartedAt: s.requestStartedAt, responseReceivedAt: s.responseReceivedAt, evaluatedAt: s.evaluatedAt, httpDate: s.httpDate, slotTime: null });
      return freeze({ version: 'unfarmd-helius-native/1', sourceGo: false, state: bound.acquisition === 'synthetic_fixture' ? 'offline_fixture' : 'observed', reason: null, observation });
    };
    try {
      return await Promise.race([work(), new Promise<NativeResult>(resolve => { timer = setTimeout(() => { halt(); resolve(grey('timeout')); }, deadlineMs); })]);
    } catch (error) {
      const reason = error instanceof Rejected || error instanceof BoundaryError || error instanceof NativeRejected ? error.reason : 'uncertain';
      if (lease || !NO_HALT.has(reason)) { halt(); }
      return grey(reason);
    } finally {
      clearTimeout(timer); request.signal.removeEventListener('abort', onAbort); abort.abort(); if (read) dispose(read); if (ownsActive) active = false; if (stopIntent) stopping = false; if (inFlight === abort) inFlight = undefined;
    }
  };
}
