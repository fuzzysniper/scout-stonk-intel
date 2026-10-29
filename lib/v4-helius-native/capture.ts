import 'server-only';
import { BoundaryError } from '../onchain-mint/server/rpc';
import { createHash } from 'node:crypto';
import type { MintFactsV1 } from '../onchain-mint/contract';
import { decodeResponse } from '../onchain-mint/decoder';
import { freeze, strictJson } from '../onchain-mint/validation';
import type { FixedRpcRead } from '../v4-helius-pilot/server/contract';
import { boundedBody, inspectResponse, need, Rejected } from '../v4-helius-pilot/server/transport';
import { BOUNDS } from '../v4-helius-pilot/server/policy';
import { targetUrl } from '../v4-helius-pilot/server/transport';
import { inspectBinding, type TransportBinding } from './transport';

/** No caller-supplied capture/receipt, body, hash or acquisition label. Snapshot before every await. */
export async function acquire(binding: TransportBinding, read: FixedRpcRead, signal: AbortSignal, clock: () => number): Promise<MintFactsV1> {
  const bound = inspectBinding(binding); need(bound, 'disabled');
  const url = targetUrl(read), key = new URL(url).searchParams.get('api-key'); need(key);
  const mint = read.mint, id = read.id, start = clock();
  const response = await bound.transport(url, { method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store',
    referrerPolicy: 'no-referrer', signal,
    body: JSON.stringify({ jsonrpc: '2.0', id, method: 'getAccountInfo', params: [mint, { encoding: 'jsonParsed', commitment: 'finalized' }] }) });
  clock(); need(!signal.aborted, 'timeout');
  try {
    if (response.status !== 200) {
      need(false, response.status === 429 ? 'rate_limited' : [401, 403].includes(response.status) ? 'access_denied' : 'upstream_unavailable');
    }
    inspectResponse(response, read);
    // Immutable header snapshot; no clock or hash is accepted from a provider-supplied capture object.
    const httpDate = response.headers.get('date');
    const text = await boundedBody(response, signal, BOUNDS.responseBytes), received = clock();
    need(!signal.aborted, 'timeout');
    need(!text.includes(key) && !JSON.stringify(strictJson(text)).includes(key));
    const evaluated = clock(), digest = createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
    const facts = await decodeResponse({ mint, requestId: id, text,
      requestStartedAt: new Date(start).toISOString(), responseReceivedAt: new Date(received).toISOString(), evaluatedAt: new Date(evaluated).toISOString(),
      httpDate, acquisition: bound.acquisition, endpointHost: BOUNDS.host });
    clock(); need(!signal.aborted, 'timeout');
    if (facts.source) need(facts.source.responseSha256 === digest && facts.source.acquisition === bound.acquisition && facts.mint === mint);
    need(!JSON.stringify(facts).includes(key));
    return freeze(facts);
  } catch (error) {
    if (error instanceof Rejected || error instanceof BoundaryError) throw error;
    throw new Rejected('invalid_response');
  } finally { void response.body?.cancel().catch(() => undefined); }
}
