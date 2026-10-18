import type { Rejection, ReviewIdentity } from "./expansion-contract";
import { isExactSolanaMint } from "./guards";
import { strictJson } from "./strict-json";

export class ReviewRejected extends Error {
  constructor(readonly reason: Rejection) { super(reason); }
}
export function need(value: unknown, reason: Rejection): asserts value {
  if (!value) throw new ReviewRejected(reason);
}
function object(v: unknown): Record<string, unknown> {
  need(v && typeof v === "object" && !Array.isArray(v), "schema_drift");
  return v as Record<string, unknown>;
}
function keys(v: Record<string, unknown>, allowed: readonly string[], required: readonly string[]) {
  need(!Object.keys(v).some(k => /epoch|config(?:uration)?Version|rewardVersion|programVersion/i.test(k)), "epoch_requires_review");
  need(Object.keys(v).every(k => allowed.includes(k)) && required.every(k => k in v), "schema_drift");
}
function envelope(v: unknown, dataKeys: readonly string[]): Record<string, unknown> {
  const root = object(v); keys(root, ["data", "meta"], ["data", "meta"]);
  const meta = object(root.meta); keys(meta, ["generatedAt"], ["generatedAt"]);
  const data = object(root.data); keys(data, dataKeys, dataKeys);
  return data;
}
function rejectEpochFields(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    need(!/epoch|config(?:uration)?Version|rewardVersion|programVersion/i.test(key), "epoch_requires_review");
    need(!/^(?:schemaVersion|apiVersion)$/i.test(key), "schema_drift");
    rejectEpochFields(child);
  }
}

export function decodeIdentityBody(body: string): unknown {
  try { return strictJson(body); } catch { throw new ReviewRejected("source_json"); }
}

/** Only identity/mode/units are interpreted. No counter, market or wallet population is read. */
export function verifyIdentityBodies(bodies: readonly unknown[], identity: ReviewIdentity): readonly string[] {
  need(bodies.length === 3, "request_budget");
  bodies.forEach(rejectEpochFields);
  const registry = envelope(bodies[0], ["pairs", "selectBy", "ambiguousSymbolCount", "standardV2Enabled"]);
  need(registry.selectBy === "mint" && Array.isArray(registry.pairs) && registry.pairs.length > 0 && registry.pairs.length <= 1024, "identity_mismatch");
  const quotes = registry.pairs.map(object), seen = new Set<string>(), symbols = new Map<string, number>();
  for (const q of quotes) {
    need(isExactSolanaMint(q.mint) && !seen.has(q.mint) && typeof q.symbol === "string" && q.symbol.length > 0 && q.symbol.length <= 32, "identity_mismatch");
    seen.add(q.mint); const symbol = q.symbol.toLowerCase(); symbols.set(symbol, (symbols.get(symbol) ?? 0) + 1);
  }
  need(registry.ambiguousSymbolCount === [...symbols.values()].filter(n => n > 1).length && quotes.every(q => q.symbolAmbiguous === ((symbols.get((q.symbol as string).toLowerCase()) ?? 0) > 1)), "identity_mismatch");
  const q = quotes.find(q => q.mint === identity.quoteMint);
  need(q && q.symbol === identity.quoteSymbol && q.name === identity.quoteName && q.decimals === identity.quoteDecimals && q.tokenProgram === identity.quoteTokenProgram && q.category === identity.quoteCategory && q.symbolAmbiguous === identity.quoteSymbolAmbiguous, "identity_mismatch");

  const catalog = envelope(bodies[1], ["tokens", "pagination", "network"]);
  const page = object(catalog.pagination); keys(page, ["page", "pageSize", "total", "totalPages"], ["page", "pageSize", "total", "totalPages"]);
  need(catalog.network === "mainnet-beta" && Array.isArray(catalog.tokens) && Number.isSafeInteger(page.total) && (page.total as number) >= 0 && page.page === 1 && page.pageSize === 25 && page.totalPages === Math.ceil((page.total as number) / 25) && catalog.tokens.length === Math.min(25, page.total as number), "schema_drift");
  const tokens = catalog.tokens.map(object), mints = new Set<string>();
  for (const t of tokens) {
    const quote = object(t.quote);
    need(isExactSolanaMint(t.mint) && !mints.has(t.mint) && quote.mint === identity.quoteMint && quote.symbol === identity.quoteSymbol && quote.name === identity.quoteName, "identity_mismatch");
    mints.add(t.mint);
  }
  const token = tokens.find(t => t.mint === identity.mint);
  need(token, "candidate_absent_from_sample");
  keys(token, ["mint", "pool", "name", "symbol", "quote", "launchpad", "mode", "quoteOnlyFees", "transferFee", "flywheel", "imageUrl", "metadataUri", "links", "market", "status", "graduationProgress", "graduatedAt", "createdAt", "communityMode", "feeRecipients"], ["mint", "pool", "name", "symbol", "quote", "mode"]);
  need(token.symbol === identity.symbol && token.name === identity.name && token.mode === "reward" && token.pool === identity.poolMint && isExactSolanaMint(token.pool), "identity_mismatch");

  const rewards = object(bodies[2]);
  keys(rewards, ["mint", "mode", "quote", "basis", "rewards", "base", "generatedAt"], ["mint", "mode", "quote", "basis", "generatedAt"]);
  const unit = object(rewards.quote); keys(unit, ["mint", "symbol", "decimals"], ["mint", "symbol", "decimals"]);
  need(rewards.mint === identity.mint && rewards.mode === "reward" && rewards.basis === "ledger" && unit.mint === identity.quoteMint && unit.symbol === identity.quoteSymbol && unit.decimals === identity.quoteDecimals, "identity_mismatch");
  return bodies.map((body, i) => {
    const root = object(body), clock = i === 2 ? root.generatedAt : object(root.meta).generatedAt;
    need(typeof clock === "string", "source_clock"); return clock;
  });
}
