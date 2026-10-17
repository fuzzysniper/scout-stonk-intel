// Offline audit/generation only. Not imported by either runtime entry point.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
if (!process.env.EVIDENCE_TEST_BUILD) throw new Error("offline_build_required");
const compiled = name => require(resolve(process.env.EVIDENCE_TEST_BUILD, name + ".js"));
const { EXPANSION_CANDIDATES, OFFLINE_LIMITS, subjectPaths } = compiled("expansion-catalog");
const { CAPTURE, ORIGIN } = compiled("catalog");
const { decodeIdentityBody, verifyIdentityBodies } = compiled("identity-review");
const { utcMicros } = compiled("guards");
export const root = fileURLToPath(new URL("../../../..", import.meta.url));
export const catalogPin = { path: "research/reward-candidates.json", sha256: "7334efa7ccaaa8cf54d0eeb864cc407a0a4ca419dca92f94cab47467c957f7c6" };
export const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const need = (ok, reason) => { if (!ok) throw new Error(reason); };

export function projectCandidates(document, catalog) {
  need(document?.packets?.length === 28 && catalog?.version === 1 && catalog.activation === "disabled" && catalog.purpose === "offline_candidate_review" && catalog.candidates?.length === 16, "inactive_catalog_required");
  need(JSON.stringify(catalog.rights) === JSON.stringify({ retention: "unverified", financialPublication: "withheld", rawRedistribution: "unverified", commercialUse: "unverified" }), "rights_unverified_required");
  return EXPANSION_CANDIDATES.map(identity => {
    const match = catalog.candidates.filter(c => c.mint === identity.mint);
    need(match.length === 1, "candidate_identity");
    const c = match[0];
    for (const key of ["mint", "symbol", "name", "poolMint", "quoteMint", "quoteSymbol", "quoteDecimals", "quoteTokenProgram", "quoteSymbolAmbiguous"]) need(c[key] === identity[key], "candidate_identity");
    need(c.evidence.registryPacket === 0 && c.evidence.catalogPacket === identity.catalogPacket && c.evidence.rewardsPacket === identity.rewardsPacket, "candidate_receipts");
    const indexes = [0, identity.catalogPacket, identity.rewardsPacket], paths = subjectPaths(identity);
    const limits = [OFFLINE_LIMITS.registryBytes, OFFLINE_LIMITS.catalogBytes, OFFLINE_LIMITS.rewardBytes];
    const packets = indexes.map((index, i) => {
      const p = document.packets[index];
      need(p?.status === 200 && p.path === paths[i] && typeof p.body === "string" && Buffer.byteLength(p.body) === p.bytes && p.bytes <= limits[i] && hash(p.body) === p.bodySha256, "receipt_integrity");
      need(/^application\/json(?:;.*)?$/i.test(p.headers?.["content-type"] ?? "") && !["link", "location", "refresh", "content-range"].some(k => k in p.headers), "transport");
      need(p.headers.age === undefined || /^\d{1,6}$/.test(p.headers.age) && Number(p.headers.age) <= OFFLINE_LIMITS.maxAgeSeconds, "transport");
      return p;
    });
    const clocks = verifyIdentityBodies(packets.map(p => decodeIdentityBody(p.body)), identity);
    const sources = packets.map((p, i) => {
      const captured = utcMicros(p.capturedAt), generated = utcMicros(clocks[i]), start = utcMicros(p.startedAt);
      need(captured !== null && generated !== null && start !== null && start <= captured && generated <= captured && captured - generated <= 600000000n, "source_clock");
      return {
        id: `capture-${indexes[i]}-${p.bodySha256}`, kind: ["quote_registry", "pair_catalog", "reward_settings"][i],
        provider: "StonkFun", url: ORIGIN + p.path, capturedAt: p.capturedAt, generatedAt: clocks[i], bodySha256: p.bodySha256,
        evidence: "retained_capture", verification: "provider_identity_at_capture",
        rights: { publication: "metadata_only", financialQuantities: "withheld", permission: "unverified" },
        retained: { ...CAPTURE, packetIndex: indexes[i] },
      };
    });
    return { mint: identity.mint, quoteMint: identity.quoteMint, sources };
  });
}

export function verifyExpansionCapture() {
  const document = readFileSync(resolve(root, CAPTURE.path)), catalog = readFileSync(resolve(root, catalogPin.path));
  need(document.length <= 1048576 && hash(document) === CAPTURE.documentSha256 && catalog.length <= 32768 && hash(catalog) === catalogPin.sha256, "document_integrity");
  return projectCandidates(decodeIdentityBody(document.toString("utf8")), decodeIdentityBody(catalog.toString("utf8")));
}
export function renderExpansion(rows) {
  return `// Generated offline: candidate-only metadata, not support or permission.\nexport const EXPANSION_RETAINED = ${JSON.stringify(rows, null, 2)} as const;\n`;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const expected = renderExpansion(verifyExpansionCapture());
  const target = resolve(root, "experiments/consumer-mvp/evidence/expansion-retained.ts");
  if (process.argv[2] === "--write") writeFileSync(target, expected);
  else need(readFileSync(target, "utf8") === expected, "metadata_out_of_date");
  process.stdout.write("Verified 3 candidate-only metadata records; no enrollment, permission or requests.\n");
}
