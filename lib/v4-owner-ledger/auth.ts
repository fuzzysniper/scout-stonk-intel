import 'server-only';
import { betterAuth } from 'better-auth';
import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { isExactPublicKey } from '../onchain-mint/validation';
import { data, prepareProfile, time } from '../v4-helius-pilot/server/profile';
import type { OwnerBoundary, OwnerPolicy, VerifiedOwnerClaims, VerifiedOwnerContext } from './contract';
import { verifiedPool, unavailable } from './postgres';
export const OWNER_COOKIE = '__Host-unfarmd-v4-owner';
export const OWNER_COOKIE_OPTIONS = Object.freeze({ useSecureCookies: false, cookies: Object.freeze({ session_token: Object.freeze({ name: OWNER_COOKIE,
  attributes: Object.freeze({ secure: true, httpOnly: true, sameSite: 'strict' as const, path: '/' }) }) }),
  crossSubDomainCookies: Object.freeze({ enabled: false as const }), disableCSRFCheck: false, disableOriginCheck: false });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
/** Explicit server-only construction; NO env, login/signup handler, deployment binding or default issuer. */
export function createVerifiedOwnerBoundary(input: OwnerPolicy, secret: string, pool: Pool, tlsHost: string, now = Date.now): OwnerBoundary {
  if (!data(input, ['issuer','audience','ownerSubject','journalOwnerId']) || !/^[A-Za-z0-9:_-]{8,128}$/.test(input.issuer)
    || !UUID.test(input.ownerSubject) || !UUID.test(input.journalOwnerId) || typeof secret !== 'string' || Buffer.byteLength(secret) < 64 || Buffer.byteLength(secret) > 256) throw unavailable();
  try { const u = new URL(input.audience); if (u.protocol !== 'https:' || u.origin !== input.audience || u.port || u.username || u.password) throw 0; } catch { throw unavailable(); }
  const policy = Object.freeze({ ...input }), db = verifiedPool(pool, tlsHost);
  const secretHash = createHash('sha256').update(secret).digest('hex');
  const auth = betterAuth({ appName: 'UNFARMD private owner boundary', baseURL: policy.audience, basePath: '/api/v4/auth', secret,
    database: db, telemetry: { enabled: false }, logger: { disabled: true }, trustedOrigins: [policy.audience],
    emailAndPassword: { enabled: false, disableSignUp: true }, socialProviders: {}, plugins: [],
    user: { modelName: 'v4_owner_user' }, account: { modelName: 'v4_owner_account' }, verification: { modelName: 'v4_owner_verification' },
    session: { modelName: 'v4_owner_session', expiresIn: 900, disableSessionRefresh: true, deferSessionRefresh: true, cookieCache: { enabled: false },
      additionalFields: { issuer: { type: 'string', required: true, input: false }, audience: { type: 'string', required: true, input: false } } },
    // Explicit __Host name + all required attributes; no Domain or insecure issuance path.
    advanced: OWNER_COOKIE_OPTIONS,
  });
  const capabilities = new WeakMap<object, VerifiedOwnerClaims>();
  const requests = new WeakMap<object, { request: Request; purpose: 'pilot' | 'journal' }>(); let terminal = false, lastClock = 0;
  const clock = () => { const t = now(); if (!time(t) || t < lastClock) { terminal = true; throw unavailable(); } lastClock = t; return t; };
  const inspect = (context: unknown): VerifiedOwnerClaims | null => {
    try { const t = clock(), c = context && typeof context === 'object' ? capabilities.get(context) : undefined;
      // Request-local capability expires quickly; every new request must recheck the DB session.
      return !terminal && c && t >= c.verifiedAt && t < c.expiresAt && t - c.verifiedAt <= 1000 ? c : null;
    } catch { return null; }
  };
  const verify = async (request: Request, purpose: 'pilot' | 'journal' = 'pilot'): Promise<VerifiedOwnerContext | null> => {
    if (terminal) return null;
    try {
      const started = clock(), u = new URL(request.url), h = request.headers;
      if (request.signal.aborted || u.origin !== policy.audience || u.username || u.password || u.hash
        || h.get('sec-fetch-site') !== 'same-origin' || h.has('origin') && h.get('origin') !== policy.audience
        || ['authorization','x-owner-id','x-owner-subject','x-owner-email','x-user-email','x-api-key','purpose','sec-purpose'].some(k => h.has(k))
        || h.has('sec-fetch-dest') && h.get('sec-fetch-dest') !== 'empty') return null;
      const json = /^application\/json(?:;\s*charset=utf-8)?$/i.test(h.get('content-type') ?? '');
      if (purpose === 'pilot') {
        if (request.method !== 'POST' || u.pathname !== '/api/v4/helius-pilot' || u.search || h.get('origin') !== policy.audience || !json
          || !/^(read|stop)$/.test(h.get('x-unfarmd-v4-pilot-intent') ?? '')) return null;
      } else {
        const collection = u.pathname === '/api/v4/theses', item = /^\/api\/v4\/theses\/([0-9a-f-]+)$/.exec(u.pathname);
        if (!collection && !(item && UUID.test(item[1]))) return null;
        const read = request.method === 'GET', write = collection ? request.method === 'POST' : request.method === 'PATCH';
        if (!read && !write) return null;
        if (read) {
          if (request.body || [...u.searchParams.keys()].some(k => k !== 'mint') || u.searchParams.getAll('mint').length !== 1 || !isExactPublicKey(u.searchParams.get('mint'))) return null;
        } else if (u.search || h.get('origin') !== policy.audience || !json) return null;
        // Journal CSRF token/currentness belongs to B's separately reviewed route adapter.
        // No fake Origin, content type or rewritten method is supplied to get a capability.
      }
      if (['host','x-forwarded-host'].some(k => h.has(k) && h.get(k) !== u.host)
        || h.has('x-forwarded-proto') && h.get('x-forwarded-proto') !== 'https') return null;
      let size = 0; h.forEach((v,k) => { size += Buffer.byteLength(v+k)+4; }); if (size > 16384) return null;
      const cookies = (h.get('cookie') ?? '').split(';').map(v => v.trim()).filter(v => v.startsWith(OWNER_COOKIE+'='));
      if (cookies.length !== 1 || cookies[0].length > 1024) return null;
      // Only the one signed cookie reaches Better Auth; no client identity/trust headers or cache cookies.
      const session = await auth.api.getSession({ headers: new Headers({ cookie: cookies[0] }), query: { disableCookieCache: true, disableRefresh: true } });
      const t = clock(); if (terminal || request.signal.aborted || t-started > 1000 || !session?.session || !session.user) return null;
      const s = session.session, created = new Date(s.createdAt).getTime(), expires = new Date(s.expiresAt).getTime();
      if (session.user.id !== policy.ownerSubject || s.userId !== policy.ownerSubject || s.issuer !== policy.issuer || s.audience !== policy.audience
        || typeof s.id !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(s.id) || !time(created) || !time(expires)
        || created > t || expires <= t || expires-created > 900000) return null;
      // One immutable server-provisioned owner/issuer/audience/secret binding, not email or Vercel identity.
      const c = await db.connect(); let rows;
      try { rows = await c.query('SELECT owner_subject,journal_owner_id,issuer,audience,secret_sha256,enabled FROM unfarmd_v4_owner.policy WHERE singleton=true AND EXISTS(SELECT 1 FROM public.v4_owner_session s WHERE s.id=$1 AND s.\"userId\"=$2 AND s.\"expiresAt\">clock_timestamp())', [s.id, policy.ownerSubject]); }
      finally { c.release(); }
      const at = clock(), p = rows.rows[0];
      if (terminal || at-started > 1000 || request.signal.aborted || rows.rowCount !== 1 || !p?.enabled || p.owner_subject !== policy.ownerSubject
        || p.journal_owner_id !== policy.journalOwnerId || p.issuer !== policy.issuer || p.audience !== policy.audience || p.secret_sha256 !== secretHash || at >= expires) return null;
      const result = Object.freeze({}) as VerifiedOwnerContext;
      requests.set(result, { request, purpose });
      capabilities.set(result, Object.freeze({ ownerSubject: policy.ownerSubject, journalOwnerId: policy.journalOwnerId, issuer: policy.issuer,
        audience: policy.audience, sessionId: s.id, authenticatedAt: created, verifiedAt: at, expiresAt: expires })); return result;
    } catch { return null; }
  };
  const reverify = async (request: Request, previous: unknown): Promise<VerifiedOwnerContext | null> => {
    const old = previous && typeof previous === 'object' ? capabilities.get(previous) : undefined;
    const binding = previous && typeof previous === 'object' ? requests.get(previous) : undefined;
    if (!old || !binding || binding.request !== request) return null;
    const fresh = await verify(request, binding.purpose), c = inspect(fresh);
    if (!c || c.ownerSubject !== old.ownerSubject || c.journalOwnerId !== old.journalOwnerId || c.sessionId !== old.sessionId
      || c.issuer !== old.issuer || c.audience !== old.audience || c.authenticatedAt !== old.authenticatedAt || c.expiresAt !== old.expiresAt) return null;
    return fresh;
  };
  return Object.freeze({ verify: (request: Request) => verify(request, 'pilot'), inspect, reverify,
    journal: () => Object.freeze({ verify: (request: Request) => verify(request, 'journal'), inspect, reverify }),
    pilot(profileInput: unknown) {
    const prepared = prepareProfile(profileInput);
    return Object.freeze({ async authenticate(request: Request) {
      if (!prepared || prepared.profile.ownerSubject !== policy.ownerSubject || prepared.profile.identityIssuer !== policy.issuer || prepared.profile.origin !== policy.audience) return null;
      const context = await verify(request), c = inspect(context), p = prepared.profile;
      if (!c || c.authenticatedAt < p.startsAt || c.expiresAt > p.expiresAt) return null;
      return Object.freeze({ subject: c.ownerSubject, issuer: c.issuer, audience: c.audience, sessionId: c.sessionId, pilotId: p.id,
        authenticatedAt: c.authenticatedAt, expiresAt: c.expiresAt });
    } });
  } });
}
