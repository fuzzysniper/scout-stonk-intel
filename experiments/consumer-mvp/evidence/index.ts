import type { ExplainMintResult, Fact, SupportedMint, WithheldQuantity } from "./contract";
import { IDENTITIES, MAX_AGE_SECONDS } from "./catalog";
import { freeze, isExactSolanaMint, utcMicros } from "./guards";
import { validateReceipts } from "./receipts";
import { RETAINED } from "./retained";

export type { ExplainMintResult, MintExplanation, Fact, SourceReceipt, SupportedMint, WithheldQuantity } from "./contract";

const supported = freeze(IDENTITIES.map(({ mint, symbol, name, quoteMint, quoteSymbol }) => ({ mint, symbol, name, quoteMint, quoteSymbol })));

/** Curated exact base mints, not discovery, quote aliases, rankings or current eligibility. */
export function listSupportedMints(): readonly SupportedMint[] { return supported; }

function quantity(state: WithheldQuantity["state"], reason: string): WithheldQuantity {
  return { state, value: null, reason };
}

/** Synchronous, read-only and portable. No I/O, caches, requests, enrollment or secrets. */
export function explainMint(mint: string, options?: Readonly<{ asOf?: string }>): ExplainMintResult {
  if (!isExactSolanaMint(mint)) return {
    schemaVersion: "1", status: "unsupported", reason: "invalid_mint",
    message: "Enter an exact Solana mint address. Names, tickers and links are not mint addresses.",
  };
  const identity = IDENTITIES.find(r => r.mint === mint);
  if (!identity) return {
    schemaVersion: "1", status: "unsupported", reason: "not_in_supported_set",
    message: "This mint is not in the reviewed evidence set. No lookup or automatic enrollment was performed.",
  };
  if (options !== undefined && (options === null || typeof options !== "object")) return unavailable("invalid_clock");
  const asOf = options?.asOf === undefined ? new Date().toISOString() : options.asOf;
  const now = utcMicros(asOf);
  if (now === null) return unavailable("invalid_clock");
  const matches = RETAINED.filter(r => r.mint === mint && r.quoteMint === identity.quoteMint);
  const sources = matches.length === 1 ? validateReceipts(matches[0].sources, identity) : null;
  if (!sources) return unavailable("evidence_integrity");
  if (sources.some(s => utcMicros(s.capturedAt)! > now)) return unavailable("invalid_clock");
  const [registry, catalog, rewards] = sources;
  const fact = (text: string, basis: Fact["basis"], sourceIds: readonly string[]): Fact => ({ text, basis, sourceIds });
  const all = sources.map(s => s.id);
  const stale = sources.some(s => now - utcMicros(s.generatedAt)! > BigInt(MAX_AGE_SECONDS) * 1000000n || now - utcMicros(s.capturedAt)! > BigInt(MAX_AGE_SECONDS) * 1000000n);
  const oldest = sources.reduce((a, b) => utcMicros(a.capturedAt)! < utcMicros(b.capturedAt)! ? a : b);
  const withheld = quantity("withheld_rights", "Financial publication permission is unverified; no amount is exposed.");
  return freeze({
    schemaVersion: "1", status: "supported",
    explanation: {
      network: "solana",
      token: { mint: identity.mint, symbol: identity.symbol, name: identity.name },
      quote: { mint: identity.quoteMint, symbol: identity.quoteSymbol, name: identity.quoteName, decimals: identity.quoteDecimals },
      freshness: { state: stale ? "stale" : "captured", evaluatedAt: asOf, oldestCapturedAt: oldest.capturedAt, maxAgeSeconds: MAX_AGE_SECONDS, currentValueClaim: false },
      whatItIs: fact(`${identity.name} (${identity.symbol}) is a Solana token. StonkFun's dated catalog lists it in a reward-mode pair with ${identity.quoteSymbol}.`, "provider_report", [catalog.id, rewards.id]),
      whatUserOwns: fact(`If you hold ${identity.symbol}, you hold that token, not ${identity.quoteSymbol} or underlying company shares or gold. These sources establish no redemption right or guaranteed claim to rewards.`, "limitation", all),
      pairRelationship: fact(`${identity.quoteSymbol} is the quoted token in this recorded pair, not an ownership certificate. Exact token and quote mints identify the relationship; their names do not prove backing or price tracking.`, "interpretation", [registry.id, catalog.id, rewards.id]),
      economicMechanism: {
        conclusion: fact(`StonkFun reported reward mode with ${identity.quoteSymbol} as the quote asset. This verifies a recorded setting, not that a holder was paid.`, "provider_report", [catalog.id, rewards.id]),
        settings: "verified_at_capture", scope: "provider_token_configuration",
        lifetimeDistribution: withheld,
        coveredIntervalFlow: quantity("not_observed", "No verified start/end observations establish covered interval flow here."),
        settlement: "not_verified", holderEntitlement: "unknown",
        holderReturns: quantity("unsupported", "Holder cashflows, eligibility, costs and valuations are not established; ROI is unavailable."),
      },
      marketContext: {
        state: "withheld", liquidityUsd: withheld, volume24hUsd: withheld,
        reason: "No current market values. Captured catalog context is provider/pool scoped; another venue or pool cannot be silently substituted.",
      },
      sources,
      risksAndUnknowns: [
        fact("Captured evidence is dated, not a live check. Current settings, eligibility and source permissions require new review.", "limitation", all),
        fact("This is a curated subset of a bounded, market-cap-selected first catalog page, not complete market coverage or a ranking.", "limitation", [catalog.id]),
        fact("A stock-linked quote label does not establish ownership of underlying shares, gold, backing, redemption or enforceable rights.", "limitation", [registry.id]),
        fact("Fee splits, recipient eligibility and enforceable holder entitlements are not established by these captures.", "limitation", [catalog.id, rewards.id]),
        fact("Provider-reported lifetime counters are not recent earning rates or proof of settled transfers. No holder return is established.", "limitation", [rewards.id]),
        fact("Names and tickers can repeat. Only the exact reviewed mints are supported; other tokens with the same label are not aliases.", "limitation", [registry.id, catalog.id]),
        fact("Source access and receipt hashes do not grant retention, redistribution or commercial permission. Financial quantities remain withheld.", "limitation", all),
      ],
    },
  });
}

function unavailable(reason: "invalid_clock" | "evidence_integrity"): ExplainMintResult {
  return { schemaVersion: "1", status: "unavailable", reason, message: "The dated evidence could not be safely evaluated. No current claim or provider lookup was made." };
}
