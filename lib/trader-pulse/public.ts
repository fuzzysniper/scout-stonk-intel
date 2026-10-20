import { PUBLIC_POLICY } from './contract';
import { isExactMint } from './validation';

/** Neutral public contract only. No import of adapter, market decoder, engine, env or credentials. */
export function publicPulse(request: Request): Response {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  };
  const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers });
  if (request.method !== 'GET') return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET' } });
  if (request.url.length > 256 || request.body !== null) return json({ error: 'invalid_request' }, 400);
  let url: URL; try { url = new URL(request.url); } catch { return json({ error: 'invalid_request' }, 400); }
  const mint = url.searchParams.get('mint');
  // Exact, unencoded one-mint query. Never a caller URL, batch, ticker, quote lookup or policy override.
  if (url.pathname !== '/api/trader-pulse' || url.hash || !isExactMint(mint) || url.search !== `?mint=${mint}`) return json({ error: 'invalid_mint_query' }, 400);
  return json({
    schemaVersion: 1, mint, status: 'source_review_required', policy: PUBLIC_POLICY,
    identity: { input: 'exact_32_byte_encoding_only', onchainMintVerified: false, marketMatch: 'not_queried' },
    sources: [{ provider: 'DEX Screener', url: `https://dexscreener.com/solana/${mint}`,
      kind: 'external_token_research_link_not_verified_pool' }],
    clocks: { retrievedAt: null, providerObservedAt: null, underlyingTradeAt: null },
    financial: null, signals: null,
    reason: 'Financial figures and derived signals withheld pending owner source-rights and observation-clock review.',
  }, 200);
}
