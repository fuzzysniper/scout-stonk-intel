// Offline build/test tool only. These Node APIs are never imported by index.ts.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const build = process.env.EVIDENCE_TEST_BUILD;
if (!build) throw new Error("offline_build_required");
const { IDENTITIES, CAPTURE, ORIGIN, REGISTRY_PATH, CATALOG_PATH, QUOTE_PROGRAM } = require(resolve(build, "catalog.js"));
const { isExactSolanaMint, utcMicros } = require(resolve(build, "guards.js"));
export const root = fileURLToPath(new URL("../../../..", import.meta.url));
export const hash = body => createHash("sha256").update(body).digest("hex");
function need(ok, code) { if (!ok) throw new Error(code); }
function parse(body) {
  try { return JSON.parse(body); }
  catch { throw new Error("source_json"); }
}

/** Semantic validator also exercised with explicitly simulated corruptions in tests. */
export function projectDocument(document) {
  need(Array.isArray(document?.packets) && document.packets.length === 28, "capture_shape");
  function packet(index, path, kind) {
    const p = document.packets[index];
    const limit = kind === "quote_registry" ? 524288 : kind === "pair_catalog" ? 131072 : 16384;
    need(p?.path === path && p.status === 200, "source_unavailable");
    need(typeof p.body === "string" && Buffer.byteLength(p.body) <= limit && Buffer.byteLength(p.body) === p.bytes && hash(p.body) === p.bodySha256, "receipt_integrity");
    need(/^application\/json(?:;.*)?$/i.test(p.headers?.["content-type"] ?? ""), "transport");
    need(!["link", "content-range", "location", "refresh"].some(k => k in p.headers), "partial_or_redirect");
    need(p.headers.age === undefined || /^\d+$/.test(p.headers.age) && Number(p.headers.age) <= 600, "cache_age");
    const value = parse(p.body);
    need(value && typeof value === "object" && !Array.isArray(value) && value.error == null, "source_error");
    const generatedAt = kind === "reward_settings" ? value.generatedAt : value.meta?.generatedAt;
    const captured = utcMicros(p.capturedAt), generated = utcMicros(generatedAt), started = utcMicros(p.startedAt);
    need(captured !== null && generated !== null && started !== null && started <= captured && generated <= captured && captured - generated <= 600000000n, "source_clock");
    return { value, receipt: {
      id: `capture-${index}-${p.bodySha256}`, kind, provider: "StonkFun", url: ORIGIN + path,
      capturedAt: p.capturedAt, generatedAt, bodySha256: p.bodySha256,
      evidence: "retained_capture", verification: "provider_identity_at_capture",
      rights: { publication: "metadata_only", financialQuantities: "withheld", permission: "unverified" },
      retained: { ...CAPTURE, packetIndex: index },
    } };
  }
  const registry = packet(0, REGISTRY_PATH, "quote_registry");
  const rows = registry.value.data?.pairs;
  need(registry.value.data?.selectBy === "mint" && Array.isArray(rows) && rows.length > 0 && rows.length <= 1024, "registry_identity");
  const seen = new Set();
  for (const row of rows) {
    need(isExactSolanaMint(row.mint) && !seen.has(row.mint), "registry_identity"); seen.add(row.mint);
  }
  return IDENTITIES.map(identity => {
    const q = rows.find(r => r.mint === identity.quoteMint);
    need(q?.symbol === identity.quoteSymbol && q.name === identity.quoteName && q.decimals === identity.quoteDecimals && q.tokenProgram === QUOTE_PROGRAM && q.category === "xstock" && q.symbolAmbiguous === (rows.filter(r => r.symbol.toLowerCase() === q.symbol.toLowerCase()).length > 1), "quote_identity");
    const catalog = packet(identity.catalogPacket, CATALOG_PATH + identity.quoteMint, "pair_catalog");
    const tokens = catalog.value.data?.tokens, page = catalog.value.data?.pagination;
    need(catalog.value.data?.network === "mainnet-beta" && Array.isArray(tokens) && tokens.length === 25 && page?.page === 1 && page.pageSize === 25 && Number.isSafeInteger(page.total) && page.total >= 25 && page.totalPages === Math.ceil(page.total / 25), "sample_shape");
    const mints = new Set();
    for (const t of tokens) {
      need(isExactSolanaMint(t.mint) && !mints.has(t.mint) && t.quote?.mint === identity.quoteMint && t.quote?.symbol === identity.quoteSymbol, "pair_filter_mismatch"); mints.add(t.mint);
    }
    const token = tokens.find(t => t.mint === identity.mint);
    need(token?.symbol === identity.symbol && token.name === identity.name && token.mode === "reward" && token.pool === identity.poolMint && isExactSolanaMint(token.pool), "token_identity");
    const rewards = packet(identity.rewardsPacket, `/api/v2/tokens/${identity.mint}/rewards`, "reward_settings");
    const r = rewards.value;
    need(r.mint === identity.mint && r.mode === "reward" && r.quote?.mint === identity.quoteMint && r.quote?.symbol === identity.quoteSymbol && r.quote?.decimals === identity.quoteDecimals && r.basis === "ledger", "reward_identity");
    // No numeric rewards/base/market field is copied, interpreted, normalized or published.
    return { mint: identity.mint, quoteMint: identity.quoteMint, sources: [registry.receipt, catalog.receipt, rewards.receipt] };
  });
}

export function verifyRetainedCapture() {
  const raw = readFileSync(resolve(root, CAPTURE.path));
  need(raw.length <= 1048576 && hash(raw) === CAPTURE.documentSha256, "document_integrity");
  return projectDocument(parse(raw));
}

export function renderMetadata(rows) {
  return `// Generated offline from hash-pinned retained captures. Metadata only; do not hand-edit.\nexport const RETAINED = ${JSON.stringify(rows, null, 2)} as const;\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const expected = renderMetadata(verifyRetainedCapture());
  const path = resolve(root, "experiments/consumer-mvp/evidence/retained.ts");
  if (process.argv[2] === "--write") writeFileSync(path, expected);
  else need(readFileSync(path, "utf8") === expected, "metadata_out_of_date");
  process.stdout.write("Verified 3 exact-mint metadata records; zero network requests.\n");
}
