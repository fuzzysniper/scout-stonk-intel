/** Disposable, OFF by default. Never imported by SCOUT's Next.js app. */
import { readFileSync } from 'node:fs';
import { runReadOnlySmoke, EXECUTION_FLAGS, EXPECTED } from './scout-neon-smoke.mjs';

function localJson(name) {
  try { return JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8')); }
  catch { return null; }
}
const failureResponse = Object.freeze({ error: 'unavailable' });
const approvalKeys = 'enabled,endMs,operationId,reviewedCommitSha,startMs';
const validTime = t => Number.isSafeInteger(t) && t > 0 && t <= 253402300799999;

export function validateWindow(approval, now, artifact) {
  return !!(approval && Object.keys(approval).sort().join(',') === approvalKeys &&
    approval.enabled === true && typeof approval.operationId === 'string' &&
    /^scout-neon-[a-zA-Z0-9_-]{8,80}$/.test(approval.operationId) &&
    /^[0-9a-f]{40}$/.test(approval.reviewedCommitSha ?? '') &&
    artifact?.version === 'scout-neon-artifact/2' && artifact.sourceClean === true &&
    approval.reviewedCommitSha === artifact.sourceCommit &&
    validTime(now) && validTime(approval.startMs) && validTime(approval.endMs) &&
    approval.endMs > approval.startMs && approval.endMs - approval.startMs <= 300000 &&
    now >= approval.startMs && now < approval.endMs);
}

function reply(res, code, data) {
  res.statusCode = code;
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

// Do not trust Content-Length alone, including in synthetic/offline request adapters.
// A slow/aborted/nonempty stream fails before driver import or credential lookup.
function emptyBody(req) {
  return new Promise(resolve => {
    if (typeof req.on !== 'function' || typeof req.resume !== 'function') return resolve(false);
    let timer, settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      for (const [event, listener] of listeners) req.removeListener(event, listener);
      if (!value) {
        req.pause?.();
        req.once('error', () => {}); // Contain a later abort/error after rejecting this stream.
      }
      resolve(value);
    };
    const listeners = [['data', () => finish(false)], ['end', () => finish(true)],
      ['error', () => finish(false)], ['aborted', () => finish(false)]];
    for (const [event, listener] of listeners) req.once(event, listener);
    timer = setTimeout(() => finish(false), 100);
    if (req.readableEnded === true) finish(true);
    else req.resume();
  });
}

export function createHandler({
  approval = localJson('./approval.json'), artifact = localJson('./artifact.json'),
  env = process.env, clock = () => Date.now(), probe = runReadOnlySmoke,
  clientFactory = async () => (await import('pg')).Client,
} = {}) {
  // Defence in depth for one warm instance, NOT a cross-instance one-shot guarantee.
  let attempted = false;
  const eligible = () => validateWindow(approval, clock(), artifact) &&
    env.VERCEL === '1' && env.VERCEL_ENV === 'production' &&
    env.VERCEL_PROJECT_ID === EXPECTED.vercelProjectId;
  return async (req, res) => {
    try {
      if (req.method !== 'POST' || req.url !== '/_ops/neon-smoke' ||
          req.headers?.['content-length'] !== '0' ||
          req.headers?.['transfer-encoding'] !== undefined ||
          req.headers?.['content-encoding'] !== undefined ||
          attempted || !eligible() || !await emptyBody(req) || attempted || !eligible()) {
        reply(res, 404, failureResponse); return;
      }
      attempted = true; // Consume before import/connect; even uncertain failures cannot retry here.
      const Client = await clientFactory();
      if (!eligible()) throw Error('expired');
      const result = await probe({argv:EXECUTION_FLAGS, env,
        executionGuard:eligible, openClient:config => new Client(config)});
      const times = [result.requestStartedAt,result.metadataReceivedAt,result.serverObservedAt];
      const parsed = times.map(t => typeof t === 'string' ? Date.parse(t) : NaN);
      if (result.ok !== true || result.checks !== 19 ||
          !['TLSv1.2','TLSv1.3'].includes(result.tls) ||
          result.rollback !== 'acknowledged' || result.authenticationMechanism !== 'not_observed' ||
          !parsed.every((t,i) => validTime(t) && new Date(t).toISOString() === times[i]) ||
          parsed[0] < approval.startMs || parsed[0] >= approval.endMs ||
          parsed[1] < parsed[0] || parsed[1] - parsed[0] > 5000 ||
          parsed[2] < parsed[0] - 1000 || parsed[2] > parsed[1] + 1000)
        throw Error('invalid_probe_report');
      reply(res, 200, {ok:true,checks:19,tls:result.tls,
        rollback:'acknowledged',authenticationMechanism:'not_observed',
        requestStartedAt:times[0],metadataReceivedAt:times[1],serverObservedAt:times[2]});
    } catch {
      reply(res, 503, failureResponse);
    }
  };
}
export default createHandler();
