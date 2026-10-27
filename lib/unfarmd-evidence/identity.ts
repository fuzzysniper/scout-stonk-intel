import type { AssetIdentity, AssetResolution } from "./contract";
import { object, text } from "./primitives";
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function pastedAddress(value: unknown, max: number): string {
  // Bound the raw input before normalization; whitespace is not part of an address.
  return text(typeof value === "string" && value.length <= 256 ? value.trim() : value, "$.address", max);
}
function solanaAddress(s: string): boolean {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return false;
  let n = 0n;
  for (const c of s) n = n * 58n + BigInt(B58.indexOf(c));
  let bytes = 0;
  while (n) { bytes++; n >>= 8n; }
  for (const c of s) { if (c !== "1") break; bytes++; }
  return bytes === 32;
}
const unknown = (ticker: string | null = null): AssetIdentity => ({ kind: "unknown", ticker, assetKey: null });
function result(state: AssetResolution["state"], asset: AssetIdentity, ...reasons: string[]): AssetResolution {
  return { state, inputOrigin: "user_entered", verification: "not_verified", asset, reasons };
}
/** No ticker lookup, checksum assurance, account existence check or cross-chain mapping. */
export function resolveAssetIdentity(input: unknown): AssetResolution {
  try {
    const r = object(input, "$", ["kind", "chain", "address", "mic", "ticker", "hints"]);
    let resolved: AssetResolution;
    if (r.kind === "solana_mint") {
      if (!["solana:mainnet", "solana:devnet", "solana:testnet"].includes(r.chain as string)) return result("conflicting_hints", unknown(), "chain_kind_mismatch");
      const address = pastedAddress(r.address, 44);
      if (!solanaAddress(address)) return result("invalid", unknown(), "invalid_solana_address");
      if (r.mic !== undefined) return result("conflicting_hints", unknown(), "market_on_token");
      const chain = r.chain as "solana:mainnet";
      resolved = result("exact_identifier", { kind: "solana_mint", chain, address, assetKey: `${chain}:${address}` }, "format_only_not_mint_verification");
    } else if (r.kind === "evm_token") {
      if (typeof r.chain !== "string" || !/^eip155:[1-9][0-9]{0,14}$/.test(r.chain)) return result("conflicting_hints", unknown(), "explicit_evm_chain_required");
      const enteredAddress = pastedAddress(r.address, 42);
      if (!/^0x[0-9a-fA-F]{40}$/.test(enteredAddress)) return result("invalid", unknown(), "invalid_evm_address");
      if (r.mic !== undefined) return result("conflicting_hints", unknown(), "market_on_token");
      const address = enteredAddress.toLowerCase();
      resolved = result("exact_identifier", { kind: "evm_token", chain: r.chain, address, enteredAddress, assetKey: `${r.chain}:${address}` }, "format_only_not_contract_verification", "checksum_not_verified");
    } else if (r.kind === "listed_equity") {
      if (r.chain !== undefined || r.address !== undefined) return result("conflicting_hints", unknown(), "token_fields_on_equity");
      const ticker = text(r.ticker, "$.ticker", 16).trim().toUpperCase();
      if (!/^[A-Z][A-Z0-9.-]{0,15}$/.test(ticker)) return result("invalid", unknown(), "invalid_ticker");
      if (r.mic === undefined || r.mic === null) return result("ambiguous", unknown(ticker), "listing_market_required");
      const mic = text(r.mic, "$.mic", 4).toUpperCase();
      if (!/^[A-Z0-9]{4}$/.test(mic)) return result("invalid", unknown(), "invalid_mic");
      resolved = result("exact_identifier", { kind: "listed_equity", mic, ticker, assetKey: `listed_equity:${mic}:${ticker}`, permanence: "listing_reference_not_permanent_security_id" }, "listing_not_verified", "corporate_actions_not_resolved");
    } else if (r.kind === "unknown") {
      if (r.chain !== undefined || r.address !== undefined || r.mic !== undefined) return result("conflicting_hints", unknown(), "unknown_identity_has_exact_hints");
      const ticker = r.ticker == null ? null : text(r.ticker, "$.ticker", 16).trim().toUpperCase();
      if (ticker !== null && !/^[A-Z][A-Z0-9.-]{0,15}$/.test(ticker)) return result("invalid", unknown(), "invalid_ticker");
      resolved = result(ticker ? "ambiguous" : "unsupported", unknown(ticker), ticker ? "ticker_not_identity" : "identity_unavailable");
    } else return result("unsupported", unknown(), "unsupported_asset_kind");
    if (r.ticker !== undefined && r.kind !== "unknown" && r.kind !== "listed_equity") {
      const hint = text(r.ticker, "$.ticker", 16);
      if (!/^[a-zA-Z][a-zA-Z0-9.-]{0,15}$/.test(hint)) return result("invalid", unknown(), "invalid_ticker");
      // A ticker is only an unverified label. It cannot confirm or contradict an address mapping.
    }
    if (r.hints !== undefined) {
      if (!Array.isArray(r.hints) || r.hints.length > 8) return result("invalid", unknown(), "invalid_hints");
      for (const hint of r.hints) {
        if (!hint || typeof hint !== "object" || "hints" in hint) return result("invalid", unknown(), "nested_hints");
        const other = resolveAssetIdentity(hint);
        if (other.state !== "exact_identifier" || resolved.state !== "exact_identifier" || other.asset.assetKey !== resolved.asset.assetKey) return result("conflicting_hints", unknown(), "identities_disagree_or_unresolved");
      }
    }
    return resolved;
  } catch { return result("invalid", unknown(), "malformed_identity"); }
}
/** Validates keys by resolving their exact components; never assigns an asset from a ticker. */
export function isAssetKey(key: unknown): key is string {
  if (typeof key !== "string" || key.length > 160) return false;
  const parts = key.split(":");
  let r: AssetResolution;
  if (parts.length === 3 && parts[0] === "solana") r = resolveAssetIdentity({ kind: "solana_mint", chain: parts.slice(0, 2).join(":"), address: parts[2] });
  else if (parts.length === 3 && parts[0] === "eip155") r = resolveAssetIdentity({ kind: "evm_token", chain: parts.slice(0, 2).join(":"), address: parts[2] });
  else if (parts.length === 3 && parts[0] === "listed_equity") r = resolveAssetIdentity({ kind: "listed_equity", mic: parts[1], ticker: parts[2] });
  else return false;
  return r.state === "exact_identifier" && r.asset.assetKey === key;
}
