import type { SourceReceipt } from "./contract";
import { CAPTURE, ORIGIN, REGISTRY_PATH, CATALOG_PATH, IDENTITIES } from "./catalog";
import { utcMicros } from "./guards";

type Identity = (typeof IDENTITIES)[number];

/** Internal metadata boundary, not an enrollment or provider-response API. */
export function validateReceipts(value: unknown, identity: Identity): readonly SourceReceipt[] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const expected = [
    [0, REGISTRY_PATH, "quote_registry"],
    [identity.catalogPacket, CATALOG_PATH + identity.quoteMint, "pair_catalog"],
    [identity.rewardsPacket, `/api/v2/tokens/${identity.mint}/rewards`, "reward_settings"],
  ] as const;
  const result: SourceReceipt[] = [];
  for (let i = 0; i < expected.length; i++) {
    const s = value[i] as Partial<SourceReceipt> | null;
    const [index, path, kind] = expected[i];
    if (!s || s.kind !== kind || s.provider !== "StonkFun" || s.url !== ORIGIN + path ||
        typeof s.bodySha256 !== "string" || !/^[a-f0-9]{64}$/.test(s.bodySha256) ||
        s.id !== `capture-${index}-${s.bodySha256}` || s.evidence !== "retained_capture" ||
        s.verification !== "provider_identity_at_capture" ||
        s.rights?.publication !== "metadata_only" || s.rights.financialQuantities !== "withheld" || s.rights.permission !== "unverified" ||
        s.retained?.commit !== CAPTURE.commit || s.retained.path !== CAPTURE.path ||
        s.retained.documentSha256 !== CAPTURE.documentSha256 || s.retained.packetIndex !== index) return null;
    const captured = utcMicros(s.capturedAt), generated = utcMicros(s.generatedAt);
    if (captured === null || generated === null || generated > captured || captured - generated > 600000000n) return null;
    // Explicit allowlisted projection: unknown properties can never reach a consumer.
    result.push({
      id: s.id, kind, provider: "StonkFun", url: s.url,
      capturedAt: s.capturedAt!, generatedAt: s.generatedAt!, bodySha256: s.bodySha256,
      evidence: "retained_capture", verification: "provider_identity_at_capture",
      rights: { publication: "metadata_only", financialQuantities: "withheld", permission: "unverified" },
      retained: { ...CAPTURE, packetIndex: index },
    });
  }
  return result;
}
