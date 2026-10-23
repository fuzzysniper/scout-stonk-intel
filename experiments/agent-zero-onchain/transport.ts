import https from 'node:https';
import { accountsRequest, LIMITS, need, PIN, Stop, timeRequest } from './policy';
import type { Capture } from './decode';
import { requireApproval, type Approval } from './approval';
const used = new WeakSet<object>();
/** Direct owner-PC transport only. Never silently bypass an inherited proxy. */
export function transportPreflight() {
  need(!process.env.CI && !process.env.VERCEL, 'NO_CI_OR_HOSTED_RPC_PROBE');
  need(!['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy'].some(k => process.env[k]), 'PROXY_TRANSPORT_REQUIRES_SEPARATE_REVIEW');
  need(!process.env.NODE_TLS_REJECT_UNAUTHORIZED || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '1', 'TLS_VERIFICATION_REQUIRED');
}
/** Created only after the CLI has durably claimed an admitted owner approval. No default reader. */
export function createPublicReader(approval: Approval) {
  requireApproval(approval, new Date().toISOString()); need(!used.has(approval), 'APPROVAL_READER_ALREADY_CREATED'); transportPreflight(); used.add(approval);
  let attempts = 0;
  return (requestBody: string) => {
    requireApproval(approval, new Date().toISOString()); transportPreflight();
    const match = /^\{"jsonrpc":"2.0","id":2,"method":"getBlockTime","params":\[([1-9]\d{0,19})\]\}$/.exec(requestBody);
    need(requestBody === accountsRequest() || match && requestBody === timeRequest(match[1]), 'FORBIDDEN_RPC_REQUEST');
    need(attempts < LIMITS.attempts, 'NATIVE_ATTEMPT_CAP'); attempts++;
    return readPublicRpc(requestBody);
  };
}
function readPublicRpc(requestBody: string): Promise<Capture> {
  transportPreflight();
  const match = /^\{"jsonrpc":"2.0","id":2,"method":"getBlockTime","params":\[([1-9]\d{0,19})\]\}$/.exec(requestBody);
  need(requestBody === accountsRequest() || match && requestBody === timeRequest(match[1]), 'FORBIDDEN_RPC_REQUEST');
  const requestedAt = new Date().toISOString();
  return new Promise((resolve, reject) => {
    let done = false, request: ReturnType<typeof https.request> | undefined;
    const chunks: Buffer[] = []; let size = 0;
    const timer = setTimeout(() => fail('RPC_TIMEOUT'), LIMITS.timeoutMs);
    function fail(code: string) { if (done) return; done = true; clearTimeout(timer); request?.destroy(); reject(new Stop(code)); }
    try {
      request = https.request(PIN.endpoint, { method: 'POST', agent: false, rejectUnauthorized: true, headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Accept-Encoding': 'identity', 'Content-Length': Buffer.byteLength(requestBody) } }, response => {
        const length = response.headers['content-length'];
        if (length && (!/^\d{1,9}$/.test(length) || Number(length) > LIMITS.bodyBytes)) { fail('BODY_LIMIT'); response.destroy(); return; }
        if (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity') { fail('UNSUPPORTED_CONTENT_ENCODING'); response.destroy(); return; }
        response.on('data', chunk => { if (done) return; const b = Buffer.from(chunk); size += b.length; if (size > LIMITS.bodyBytes) { fail('BODY_LIMIT'); response.destroy(); } else chunks.push(b); });
        response.on('aborted', () => fail('PARTIAL_RESPONSE'));
        response.on('error', () => fail('PARTIAL_RESPONSE'));
        response.on('end', () => { if (done) return; done = true; clearTimeout(timer); resolve({ endpoint: PIN.endpoint, network: PIN.network, requestBody, requestedAt, receivedAt: new Date().toISOString(), httpDate: response.headers.date ?? null, status: response.statusCode ?? 0, body: Buffer.concat(chunks) }); });
      });
      request.on('error', () => fail('RPC_TRANSPORT_FAILURE')); request.end(requestBody);
    } catch { fail('RPC_TRANSPORT_FAILURE'); }
  });
}
