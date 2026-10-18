import type { MintAuthority, MintFactsCore, MintFactsV1, MintFailure, MintSourceV1 } from "./contract";
import { BASE_WARNINGS, LIMITS, PUBLIC_RPC_HOST, TOKEN_PROGRAM, TOKEN_2022_PROGRAM } from "./policy";
import { freeze, isExactPublicKey, sha256, strictJson, utcMicros } from "./validation";

export type CapturedMintResponse = Readonly<{
  mint: string; requestId: number; text: string;
  requestStartedAt: string; responseReceivedAt: string; evaluatedAt: string;
  httpDate?: string | null;
  captureKind: "recorded_response" | "synthetic_fixture";
}>;
/** Trusted transport identity only; never accepted from a mint/query or public captured decoder. */
export type InternalResponse = Omit<CapturedMintResponse, "captureKind"> & {
  acquisition: NonNullable<MintSourceV1["acquisition"]>;
  endpointHost?: "api.mainnet-beta.solana.com" | "mainnet.helius-rpc.com";
};
class Rejected extends Error { constructor(readonly reason: MintFailure) { super(reason); } }
function need(ok: unknown, reason: MintFailure = "invalid_response"): asserts ok { if (!ok) throw new Rejected(reason); }
function object(v: unknown): Record<string, unknown> { need(v && typeof v === "object" && !Array.isArray(v)); return v as Record<string, unknown>; }
function keys(v: Record<string, unknown>, allowed: readonly string[], required: readonly string[] = allowed) {
  need(Object.keys(v).every(k => allowed.includes(k)) && required.every(k => k in v));
}
function authority(v: unknown): MintAuthority { need(v === null || isExactPublicKey(v)); return { state: v === null ? "absent" : "present", address: v }; }
export function failure(mint: unknown, reason: MintFailure, status: "unavailable" | "not_a_supported_mint_account" = "unavailable"): MintFactsV1 {
  return freeze({ version: "mint-facts/1", status, mint: isExactPublicKey(mint) ? mint : null, facts: null, source: null, reason, warnings: [...BASE_WARNINGS] });
}

const EXTENSION_NAMES = new Set(["uninitialized", "transferFeeConfig", "transferFeeAmount", "mintCloseAuthority", "confidentialTransferMint", "confidentialTransferAccount", "defaultAccountState", "immutableOwner", "memoTransfer", "nonTransferable", "interestBearingConfig", "cpiGuard", "permanentDelegate", "nonTransferableAccount", "confidentialTransferFeeConfig", "confidentialTransferFeeAmount", "transferHook", "transferHookAccount", "metadataPointer", "tokenMetadata", "groupPointer", "groupMemberPointer", "tokenGroup", "tokenGroupMember", "confidentialMintBurn", "unparseableExtension", "scaledUiAmountConfig", "pausableConfig", "pausableAccount", "permissionedBurnConfig"]);
function extensions(info: Record<string, unknown>, space: number, is2022: boolean): MintFactsCore["extensions"] {
  const entries = info.extensions === undefined ? [] : info.extensions;
  need(Array.isArray(entries) && entries.length <= LIMITS.extensions);
  if (!is2022) { need(space === 82 && entries.length === 0); return { assessment: "none", names: [], metadataPointer: null }; }
  need(space === 82 || space >= 166);
  const seen = new Set<string>(), names: string[] = [];
  let metadataPointer: MintFactsCore["extensions"]["metadataPointer"] = null;
  for (const entry of entries) {
    const e = object(entry); keys(e, ["extension", "state"], ["extension"]);
    need(typeof e.extension === "string" && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(e.extension) && !seen.has(e.extension));
    seen.add(e.extension); names.push(EXTENSION_NAMES.has(e.extension) ? e.extension : "unknown_extension");
    if (e.extension === "metadataPointer") {
      const state = object(e.state); keys(state, ["authority", "metadataAddress"]);
      const a = authority(state.authority), m = authority(state.metadataAddress);
      metadataPointer = { authority: a.address, metadataAddress: m.address };
    }
  }
  need(!(space === 82 && entries.length > 0));
  if (space === 82) return { assessment: "none", names: [], metadataPointer: null };
  // Agave may suppress an invalid/unknown TLV type list. Empty != no extensions on a larger mint.
  if (!names.length) names.push("unlisted_or_unparseable_extensions");
  // 166-byte extended base + 4-byte TLV header + exact 64-byte MetadataPointer payload.
  return { assessment: entries.length === 1 && names[0] === "metadataPointer" && space === 234 ? "reviewed_metadata_pointer" : "unreviewed", names, metadataPointer };
}

/** Internal acquisition projection. The public recorded decoder cannot label a fixture live. */
export async function decodeResponse(input: InternalResponse): Promise<MintFactsV1> {
  if (!isExactPublicKey(input.mint)) return failure(null, "invalid_mint");
  try {
    need(input.endpointHost === undefined || input.endpointHost === PUBLIC_RPC_HOST || input.endpointHost === "mainnet.helius-rpc.com");
    need(typeof input.text === "string" && input.text.length <= LIMITS.bytes, "response_too_large");
    const bytes = new TextEncoder().encode(input.text); need(bytes.byteLength <= LIMITS.bytes, "response_too_large");
    const start = utcMicros(input.requestStartedAt), received = utcMicros(input.responseReceivedAt), evaluated = utcMicros(input.evaluatedAt);
    need(start !== null && received !== null && evaluated !== null && start <= received && received <= evaluated, "invalid_clock");
    need(received - start <= BigInt(LIMITS.timeoutMs) * 1000n, "timeout");
    need(evaluated - received <= BigInt(LIMITS.maxSourceAgeMs) * 1000n, "stale_source");
    const httpDate = input.httpDate ?? null;
    if (httpDate !== null) {
      need(typeof httpDate === "string" && httpDate.length <= 64 && /^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(httpDate), "invalid_clock");
      const date = Date.parse(httpDate); need(Number.isFinite(date) && new Date(date).toUTCString() === httpDate, "invalid_clock");
      need(BigInt(date) * 1000n <= received && evaluated - BigInt(date) * 1000n <= BigInt(LIMITS.maxSourceAgeMs) * 1000n, "stale_source");
    }
    const root = object(strictJson(input.text)); keys(root, ["jsonrpc", "id", "result", "error"], ["jsonrpc", "id"]);
    need(root.jsonrpc === "2.0" && Number.isSafeInteger(input.requestId) && input.requestId > 0 && root.id === input.requestId);
    need(!("error" in root), "rpc_error"); need("result" in root);
    const result = object(root.result); keys(result, ["context", "value"]);
    const context = object(result.context); keys(context, ["slot", "apiVersion"], ["slot"]);
    need(Number.isSafeInteger(context.slot) && (context.slot as number) > 0);
    if (context.apiVersion !== undefined) need(typeof context.apiVersion === "string" && /^[0-9A-Za-z.+-]{1,32}$/.test(context.apiVersion));
    if (result.value === null) return failure(input.mint, "not_found", "not_a_supported_mint_account");
    const value = object(result.value);
    keys(value, ["data", "owner", "executable", "lamports", "rentEpoch", "space"], ["data", "owner", "executable", "lamports", "rentEpoch"]);
    if (value.owner !== TOKEN_PROGRAM && value.owner !== TOKEN_2022_PROGRAM) return failure(input.mint, "wrong_owner", "not_a_supported_mint_account");
    need(value.executable === false);
    // u64 rentEpoch/lamports can exceed JS safe integers. Never compute, normalize or project them.
    need(typeof value.lamports === "number" && Number.isInteger(value.lamports) && value.lamports >= 0);
    need(typeof value.rentEpoch === "number" && Number.isInteger(value.rentEpoch) && value.rentEpoch >= 0);
    if (Array.isArray(value.data)) return failure(input.mint, "unparsed_account");
    const data = object(value.data); keys(data, ["program", "parsed", "space"]);
    const is2022 = value.owner === TOKEN_2022_PROGRAM;
    need(data.program === (is2022 ? "spl-token-2022" : "spl-token"));
    need(Number.isSafeInteger(data.space) && (data.space as number) >= 82 && (data.space as number) <= LIMITS.bytes);
    if (value.space !== undefined) need(value.space === data.space);
    const parsed = object(data.parsed); keys(parsed, ["type", "info"]);
    if (parsed.type !== "mint") return failure(input.mint, "not_mint", "not_a_supported_mint_account");
    const info = object(parsed.info); keys(info, ["mintAuthority", "supply", "decimals", "isInitialized", "freezeAuthority", "extensions"], ["mintAuthority", "supply", "decimals", "isInitialized", "freezeAuthority"]);
    need(typeof info.isInitialized === "boolean");
    if (!info.isInitialized) return failure(input.mint, "uninitialized", "not_a_supported_mint_account");
    need(typeof info.supply === "string" && /^(?:0|[1-9]\d{0,19})$/.test(info.supply) && BigInt(info.supply) <= 18446744073709551615n);
    need(typeof info.decimals === "number" && Number.isInteger(info.decimals) && info.decimals >= 0 && info.decimals <= 255);
    const mintAuthority = authority(info.mintAuthority), freezeAuthority = authority(info.freezeAuthority);
    const ext = extensions(info, data.space as number, is2022), unreviewed = ext.assessment === "unreviewed";
    const digits = info.supply.padStart(info.decimals + 1, "0");
    const facts: MintFactsCore = {
      network: "solana-mainnet", mint: input.mint, program: is2022 ? "token_2022" : "spl_token", ownerProgram: value.owner, initialized: true,
      supply: { raw: info.supply, decimals: info.decimals, decimalAmount: info.decimals ? digits.slice(0, -info.decimals) + "." + digits.slice(-info.decimals) : digits },
      mintAuthority, freezeAuthority, extensions: ext,
      interpretation: { minting: unreviewed ? "extension_review_required" : mintAuthority.state === "present" ? "authority_present" : "authority_absent",
        freezing: unreviewed ? "extension_review_required" : freezeAuthority.state === "present" ? "authority_present" : "authority_absent" },
    };
    return freeze({ version: "mint-facts/1", status: unreviewed ? "unsupported_extensions" : "verified_onchain_mint_at_slot", mint: input.mint, facts,
      source: { endpointHost: input.endpointHost ?? PUBLIC_RPC_HOST, method: "getAccountInfo", encoding: "jsonParsed", commitment: "finalized",
        assurance: "rpc_reported_not_independently_replayed", contextSlot: String(context.slot), slotTime: null,
        requestStartedAt: input.requestStartedAt, responseReceivedAt: input.responseReceivedAt, checkedAt: input.responseReceivedAt,
        httpDate, responseSha256: await sha256(bytes), evaluatedAt: input.evaluatedAt, freshness: "fresh", acquisition: input.acquisition },
      warnings: [...BASE_WARNINGS, ...(unreviewed ? ["Token-2022 extensions require review; base authorities do not establish all issuance, transfer or freeze behavior."] : []),
        ...(httpDate === null ? ["HTTP server clock unavailable; chain block time is not supplied by this method."] : [])],
    });
  } catch (error) { return failure(input.mint, error instanceof Rejected ? error.reason : "invalid_response"); }
}

/** Pure, explicitly recorded/synthetic decoding. No I/O and no claim of newly acquired facts. */
export async function decodeCapturedMintResponse(input: CapturedMintResponse): Promise<MintFactsV1> {
  if (!input || typeof input !== "object") return failure(null, "invalid_response");
  if (input.captureKind !== "recorded_response" && input.captureKind !== "synthetic_fixture") return failure(input.mint, "invalid_response");
  return decodeResponse({ ...input, acquisition: input.captureKind, endpointHost: PUBLIC_RPC_HOST });
}
