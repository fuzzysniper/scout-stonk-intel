/**
 * Disposable Vercel Build Output API wrapper. REVIEW ONLY: the approved operation
 * manifest defaults to OFF. Never imported by SCOUT's actual Next.js app.
 */
import { readFileSync } from 'node:fs';
import { runReadOnlySmoke, EXECUTION_FLAGS, EXPECTED } from './scout-neon-smoke.mjs';

const DEFAULT_APPROVAL = Object.freeze({ enabled: false });
function systemApproval() {
  try { return JSON.parse(readFileSync(new URL('./approval.json', import.meta.url), 'utf8')); }
  catch { return DEFAULT_APPROVAL; }
}
const failureResponse = Object.freeze({ error: 'unavailable' });

export function validateWindow(approval, now) {
  if (!approval || approval.enabled !== true || typeof approval.operationId !== 'string' ||
      !/^scout-neon-[a-zA-Z0-9_-]{8,80}$/.test(approval.operationId) ||
      !/^[0-9a-f]{40}$/.test(approval.reviewedCommitSha ?? '') ||
      !Number.isFinite(now) ||
      !Number.isSafeInteger(approval.startMs) || !Number.isSafeInteger(approval.endMs) ||
      approval.endMs <= approval.startMs || approval.endMs - approval.startMs > 300000 ||
      now < approval.startMs || now >= approval.endMs) return false;
  return true;
}

function reply(res, code, data) {
  res.statusCode = code;
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function createHandler({
  approval = systemApproval(), env = process.env,
  clock = () => Date.now(), probe = runReadOnlySmoke,
  clientFactory = async () => (await import('pg')).Client,
} = {}) {
  return async (req, res) => {
    // No credential lookup, driver import, or DB call before method, path,
    // approval window, production identity, and empty-body validation.
    const uri = req.url;
    if (req.method !== 'POST' || uri !== '/_ops/neon-smoke') {
      reply(res, 404, failureResponse); return;
    }
    const headers = req.headers ?? {};
    const contentLength = headers['content-length'];
    if ((contentLength !== undefined && contentLength !== '0') ||
        headers['transfer-encoding'] !== undefined ||
        headers['content-encoding'] !== undefined ||
        !validateWindow(approval, clock()) ||
        env.VERCEL !== '1' || env.VERCEL_ENV !== 'production' ||
        env.VERCEL_PROJECT_ID !== EXPECTED.vercelProjectId) {
      reply(res, 404, failureResponse); return;
    }
    try {
      const Client = await clientFactory();
      const result = await probe({
        argv: EXECUTION_FLAGS, env,
        openClient: config => new Client(config),
      });
      if (result.ok !== true || result.checks !== 19 ||
          result.rollback !== 'acknowledged' ||
          result.authenticationMechanism !== 'not_observed')
        throw Error('invalid_probe_report');
      // Allowlisted response only, never URL/error/driver/object spread.
      reply(res, 200, {ok:true,checks:19,tls:result.tls,
        rollback:'acknowledged',authenticationMechanism:'not_observed',
        requestStartedAt:result.requestStartedAt,
        metadataReceivedAt:result.metadataReceivedAt,
        serverObservedAt:result.serverObservedAt});
    } catch {
      reply(res, 503, failureResponse);
    }
  };
}
export default createHandler();
