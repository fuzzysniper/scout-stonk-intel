// INVENTED OFFLINE FORMAT FIXTURES. No live observations; no actual token claims.
export { MINT, OTHER, TOKEN, TOKEN2022, TIME, envelope, token2022 } from '../../lib/onchain-mint/tests/fixtures.mjs';
import { MINT, TIME, envelope } from '../../lib/onchain-mint/tests/fixtures.mjs';
export function capture(body = envelope(), extra = {}) {
  return { kind: 'synthetic_fixture',
    request: { network: 'solana-mainnet', endpointHost: 'mainnet.helius-rpc.com', method: 'getAccountInfo', encoding: 'jsonParsed', commitment: 'finalized', mint: MINT, id: 1 },
    requestStartedAt: TIME, responseReceivedAt: TIME, evaluatedAt: TIME, httpStatus: 200, text: JSON.stringify(body), ...extra };
}
export const info = e => e.result.value.data.parsed.info;
