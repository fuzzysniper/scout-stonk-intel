// Explicitly synthetic policy/acquisition/response fixtures. No real license or live observation.
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { digestBody } from "../tools/pilot-protocol.mjs";
const require = createRequire(import.meta.url);
const { IDENTITIES, QUOTE_PROGRAM, ORIGIN } = require(resolve(process.env.EVIDENCE_TEST_BUILD, "catalog.js"));
export const START = "2026-10-18T04:00:00Z", END = "2026-10-18T04:00:01Z";
export const subject = IDENTITIES[0];
export function fixturePolicy(identity = subject) {
  return { kind: "offline-policy-fixture/1", mint: identity.mint,
    validFrom: START, validUntil: "2026-10-18T04:10:00Z", access: true, transientProcessing: true,
    publicFields: ["tokenIdentity", "labels", "pair", "rewardMode", "provenance"], rawRetentionSeconds: 0, metadataCacheSeconds: 600 };
}
export function fixtureTranscript(identity = subject) {
  const quote = { mint: identity.quoteMint, symbol: identity.quoteSymbol, name: identity.quoteName,
    decimals: identity.quoteDecimals, tokenProgram: QUOTE_PROGRAM, category: "xstock", symbolAmbiguous: false };
  const bodies = [
    { data: { pairs: [quote], selectBy: "mint", ambiguousSymbolCount: 0, standardV2Enabled: false }, meta: { generatedAt: "2026-10-18T03:59:59Z" } },
    { data: { tokens: [{ mint: identity.mint, name: identity.name, symbol: identity.symbol, pool: identity.poolMint,
      mode: "reward", quote: { mint: quote.mint, name: quote.name, symbol: quote.symbol } }],
      pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 }, network: "mainnet-beta" }, meta: { generatedAt: "2026-10-18T04:00:00.100Z" } },
    { mint: identity.mint, mode: "reward", quote: { mint: quote.mint, symbol: quote.symbol, decimals: quote.decimals }, basis: "ledger", generatedAt: "2026-10-18T04:00:00.400Z" },
  ];
  const paths = ["/api/public/v1/pairs", `/api/public/v1/tokens?sort=marketCap&page=1&pageSize=25&quoteMint=${identity.quoteMint}`, `/api/v2/tokens/${identity.mint}/rewards`];
  return { version: "stonkfun-identity-transcript/1", kind: "offline_transcript", receipts: bodies.map((b, i) => ({
    path: paths[i], responsePath: paths[i], outcome: "response", status: 200,
    startedAt: `2026-10-18T04:00:00.${i * 2 + 1}00000Z`, capturedAt: `2026-10-18T04:00:00.${i * 2 + 2}00000Z`,
    headers: { "content-type": "application/json", age: "0" }, body: JSON.stringify(b),
  })) };
}
export function fixtureAcquisition(transcript) {
  return { kind: "offline-acquisition-fixture/1", requestedOrigin: ORIGIN, finalOrigin: ORIGIN,
    tlsVerified: true, redirects: 0, bodySha256: transcript.receipts.map(p => digestBody(p.body)) };
}
export function editFixture(t, index, mutate) {
  const b = JSON.parse(t.receipts[index].body); mutate(b); t.receipts[index].body = JSON.stringify(b); return t;
}
