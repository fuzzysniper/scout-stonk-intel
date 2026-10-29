import { decodeResponse } from "../onchain-mint/decoder";
import { freeze, isExactPublicKey, strictJson } from "../onchain-mint/validation";
import { LIMITS } from "../onchain-mint/policy";
import type { Check, FactState, HeliusCapture, ProjectionReason, SolanaFactProjectionV1 } from "./contract";

export const HELIUS_FACT_POLICY = freeze({
  sourceGo: false as const,
  endpointHost: "mainnet.helius-rpc.com" as const,
  method: "getAccountInfo" as const,
  maxAgeMs: 60000 as const,
  maxResponseBytes: 65536,
  maxDurationMs: 5000,
  runtimeAttempts: 0,
  retries: 0,
});
const LIMITATIONS = [
  "Offline projection only. Synthetic captures are invented test inputs; recorded captures are replays, not newly acquired observations.",
  "Helius is the targeted RPC protocol, not an offline-authenticated source. No capture label or hash proves provider authenticity.",
  "Finalized is the captured request commitment. The RPC context slot is not account last-change time; block time and current chain currency are not independently verified.",
  "Green means only this check passed. Authority absence is a narrow technical good, not rug-proof, safe, investment advice or proof of signer control.",
  "Raw supply is not circulating supply, market cap or holder ownership. No name/symbol legitimacy, holder concentration, LP lock, returns or trading inference is established.",
] as const;
function check(state: FactState, color: Check["color"], code: string, explanation: string, evidenceFields: readonly string[] = []): Check {
  return { state, color, code, explanation, evidenceFields };
}
function unknowns(): readonly Check[] {
  return [
    check("unknown", "grey", "holder_concentration_not_observed", "Holder concentration is not observed. Largest token accounts are not distinct wallets; clustering, supply coverage and insider attribution are unknown."),
    check("unknown", "grey", "liquidity_lock_not_observed", "Liquidity depth, LP ownership and locks are not established by mint account fields."),
    check("unknown", "grey", "identity_legitimacy_not_observed", "Name, symbol, issuer legitimacy, backing and ownership claims are not verified."),
  ];
}
function blankChecks(state: FactState, reason: ProjectionReason): SolanaFactProjectionV1["checks"] {
  const c = check(state, "grey", reason, "No admitted interpretation for this check. See the explicit result reason; unknown is not absent or safe.");
  return { account: c, supply: c, mintAuthority: c, freezeAuthority: c, extensions: c };
}
export function unavailable(mint: unknown, reason: ProjectionReason, state: FactState = "unavailable", providerError: SolanaFactProjectionV1["providerError"] = null): SolanaFactProjectionV1 {
  return freeze({ version: "unfarmd-solana-facts/1", sourceGo: false, network: "solana-mainnet", requestedMint: isExactPublicKey(mint) ? mint : null,
    state, reason, observations: null, providerError, provenance: null, checks: blankChecks(state, reason), unknowns: unknowns(), limitations: [...LIMITATIONS] });
}
function object(v: unknown): v is Record<string, unknown> { return v !== null && typeof v === "object" && !Array.isArray(v); }
function keys(v: Record<string, unknown>, allowed: readonly string[], required: readonly string[] = allowed): boolean {
  return (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)
    && Reflect.ownKeys(v).every(k => typeof k === "string" && allowed.includes(k) && "value" in Object.getOwnPropertyDescriptor(v, k)!)
    && required.every(k => Object.hasOwn(v, k));
}
/** Strictly bounded RPC error codes; never returns provider text, URLs, headers, params or unknown codes. */
function providerFailure(text: string, id: number): { reason: ProjectionReason; rpcCode: number | null } | null {
  const root: unknown = strictJson(text);
  if (!object(root) || !("error" in root)) return null;
  if (!keys(root, ["jsonrpc", "id", "error"]) || root.jsonrpc !== "2.0" || root.id !== id || !object(root.error)
    || !keys(root.error, ["code", "message", "data"], ["code", "message"]) || !Number.isSafeInteger(root.error.code)
    || typeof root.error.message !== "string") return { reason: "invalid_response", rpcCode: null };
  const allowed = [-32700, -32600, -32601, -32602, -32603, -32000, -32005, 429];
  const rpcCode = allowed.includes(root.error.code as number) ? root.error.code as number : null;
  return { reason: rpcCode === 429 ? "rate_limited" : rpcCode === -32005 ? "upstream_unavailable" : "rpc_error", rpcCode };
}
/** Pure capture adapter; no fetch, env lookup, key, endpoint fallback, cache, timer or I/O. */
export async function projectHeliusCapture(requestedMint: unknown, input: unknown): Promise<SolanaFactProjectionV1> {
  if (!isExactPublicKey(requestedMint)) return unavailable(null, "invalid_mint");
  try {
    if (!object(input) || !keys(input, ["kind", "request", "requestStartedAt", "responseReceivedAt", "evaluatedAt", "httpDate", "httpStatus", "text"],
      ["kind", "request", "requestStartedAt", "responseReceivedAt", "evaluatedAt", "httpStatus", "text"])
      || (input.kind !== "synthetic_fixture" && input.kind !== "recorded_response") || !object(input.request)) return unavailable(requestedMint, "invalid_capture");
    const r = input.request;
    if (!keys(r, ["network", "endpointHost", "method", "encoding", "commitment", "mint", "id"])
      || r.network !== "solana-mainnet" || r.endpointHost !== HELIUS_FACT_POLICY.endpointHost || r.method !== "getAccountInfo"
      || r.encoding !== "jsonParsed" || r.commitment !== "finalized" || r.mint !== requestedMint
      || !Number.isSafeInteger(r.id) || (r.id as number) <= 0) return unavailable(requestedMint, "invalid_capture");
    if (!Number.isInteger(input.httpStatus) || (input.httpStatus as number) < 100 || (input.httpStatus as number) > 599) return unavailable(requestedMint, "invalid_capture");
    // Do not inspect untrusted HTTP error bodies or copy arbitrary upstream error messages.
    if (input.httpStatus !== 200) return unavailable(requestedMint,
      input.httpStatus === 429 ? "rate_limited" : input.httpStatus === 401 || input.httpStatus === 403 ? "access_denied" : "upstream_unavailable",
      "unavailable", { httpStatus: input.httpStatus as number, rpcCode: null });
    if (typeof input.text !== "string") return unavailable(requestedMint, "invalid_response");
    if (input.text.length > LIMITS.bytes || new TextEncoder().encode(input.text).byteLength > LIMITS.bytes) return unavailable(requestedMint, "response_too_large");
    if (typeof input.requestStartedAt !== "string" || typeof input.responseReceivedAt !== "string" || typeof input.evaluatedAt !== "string"
      || (input.httpDate !== undefined && input.httpDate !== null && typeof input.httpDate !== "string")) return unavailable(requestedMint, "invalid_clock");
    // Copy every original primitive BEFORE hashing awaits. Never read caller objects again.
    const captured: HeliusCapture = Object.freeze({ kind: input.kind,
      request: Object.freeze({ network: "solana-mainnet", endpointHost: "mainnet.helius-rpc.com", method: "getAccountInfo",
        encoding: "jsonParsed", commitment: "finalized", mint: requestedMint, id: r.id as number }),
      requestStartedAt: input.requestStartedAt, responseReceivedAt: input.responseReceivedAt, evaluatedAt: input.evaluatedAt,
      httpDate: input.httpDate, httpStatus: input.httpStatus as number, text: input.text });
    const decoded = await decodeResponse({ mint: requestedMint, requestId: captured.request.id, text: captured.text,
      requestStartedAt: captured.requestStartedAt, responseReceivedAt: captured.responseReceivedAt, evaluatedAt: captured.evaluatedAt,
      httpDate: captured.httpDate, acquisition: captured.kind, endpointHost: "mainnet.helius-rpc.com" });
    if (!decoded.source || !decoded.facts) {
      const error = decoded.reason === "rpc_error" ? providerFailure(captured.text, captured.request.id) : null;
      const reason = error?.reason ?? decoded.reason;
      return unavailable(requestedMint, reason, decoded.status === "not_a_supported_mint_account" ? "unsupported" : reason === "stale_source" ? "unknown" : "unavailable",
        error ? { httpStatus: 200, rpcCode: error.rpcCode } : null);
    }
    // Never export the old decoder's interpretation as a source observation.
    const { interpretation: _interpretation, ...observations } = decoded.facts;
    void _interpretation;
    const unsupported = decoded.status === "unsupported_extensions";
    const authority = (kind: "mintAuthority" | "freezeAuthority"): Check => {
      const present = observations[kind].state === "present";
      return check("observed", present ? "red" : "green", `${kind}_${present ? "present" : "absent"}`,
        kind === "mintAuthority"
          ? present ? "A base mint authority is present: additional tokens can be issued under this permission. Signer control is not established." : "No base mint authority was reported: this base permission cannot issue more tokens. This does not certify safety."
          : present ? "A base freeze authority is present: token accounts can be frozen under this permission. Signer control is not established." : "No base freeze authority was reported: this base permission cannot freeze accounts. This does not certify safety.",
        [kind]);
    };
    const checks = unsupported ? blankChecks("unsupported", "unreviewed_extensions") : {
      account: check("observed", "green", "initialized_supported_mint", "An initialized mint owned by the specified Token Program was reported; project legitimacy is not verified.", ["mint", "ownerProgram", "program", "initialized"]),
      supply: check("observed", "green", "exact_raw_supply", "Exact raw units and decimals parsed; this is neither circulating supply nor market value.", ["supply"]),
      mintAuthority: authority("mintAuthority"), freezeAuthority: authority("freezeAuthority"),
      extensions: observations.extensions.assessment === "reviewed_metadata_pointer"
        ? check("observed", "yellow", "metadata_pointer_only", "Only the exact metadata-pointer layout is reviewed. The pointer does not verify metadata, branding or issuer identity.", ["extensions"])
        : check("observed", "green", "no_extensions_reported_supported_layout", "No extensions were reported in the supported base layout. This is not a token-wide safety verdict.", ["extensions"]),
    };
    const s = decoded.source;
    return freeze({ version: "unfarmd-solana-facts/1", sourceGo: false, network: "solana-mainnet", requestedMint,
      state: unsupported ? "unsupported" : "observed", reason: unsupported ? "unreviewed_extensions" : null, observations, providerError: null,
      provenance: { provider: "helius-solana-rpc", endpointHost: "mainnet.helius-rpc.com", method: s.method, encoding: s.encoding,
        requestedCommitment: s.commitment, contextSlot: s.contextSlot, slotTime: null, requestStartedAt: s.requestStartedAt,
        responseReceivedAt: s.responseReceivedAt, evaluatedAt: s.evaluatedAt, httpDate: s.httpDate, responseSha256: s.responseSha256,
        freshness: "bounded_acquisition_age_only", maxAgeMs: 60000, captureKind: captured.kind,
        providerAuthentication: "not_verified_offline", assurance: s.assurance, identityBinding: "captured_request_not_echoed_by_account_response" },
      checks, unknowns: unknowns(), limitations: [...LIMITATIONS] });
  } catch { return unavailable(requestedMint, "invalid_response"); }
}
