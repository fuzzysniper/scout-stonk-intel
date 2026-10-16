# Canonical pair-economic contract — draft, not an API

Part of [issue #78 positioning](PAIR_ECONOMICS_V1.md). **Proposed internal model only**; the existing V1 APIs, allowlist, math and rights projection are unchanged. These types do not create verified data, permission to acquire it or a public endpoint. StonkFun's current contracts are the first mapping inputs, not contracts to rename globally.

## Identity before economics

Three keys solve different problems:

| Key | Canonical ingredients | Boundary |
| --- | --- | --- |
| Asset ID | Reviewed chain/network identifier + `token`/`native` + canonical address or explicit native sentinel | Ticker, name, decimals and wrapped/native marketing equivalence are not identity. Preserve Solana case; future chains need their own address validator. No chain defaults or cross-chain equality |
| Directional pair key | Chain + exact base asset ID + exact quote asset ID | Different base tokens sharing NVDAX form a **quote universe**, not the same pair. Reversed base/quote is a separate orientation; no automatic price inversion/merge |
| Market binding ID | Chain + integration namespace + identity kind + provider/market address, with identity assurance | Several pools/launches can implement one pair. A provider pool field is not automatically a chain-validated pool or the protocol executing its trades |

Encoding must be a versioned, length-safe canonical tuple (future validator + canonical serialization), never ticker concatenation. Use a reviewed chain namespace/reference (for example a CAIP-2-compatible registry entry), not a ticker or a default network label. Mapping today's `mainnet-beta` to that registry is future reviewed work, not new multi-chain support. An independently validated pool/program identity may later link provider bindings; an unverified source alias cannot merge records. Immutable economic observations reference both the pair and binding/scope. A launch and a downstream DEX pool remain distinct; an evidenced migration is a time-bounded relationship, not overwriting the origin. A provider's token-wide reward aggregate must not be allocated to individual pools without allocation evidence.

Unknown base decimals/program stay unknown even when the mint is known. Unknown market linkage can coexist with provider-reported token-level evidence; it cannot qualify as exact-pool economics. Reward asset can differ from quote, base or fee asset. A settings change creates a new economic configuration epoch; history does not inherit today's entitlement, recipients, fee rates or market mapping.

## Proposed typed vocabulary

This self-contained TypeScript block is documentation, not executable runtime code. Brands require future validated constructors; they are not validation by themselves. `Fact` separates measured zero from missing/unsupported/withheld facts. All collection sizes, strings, decimals, timestamps, references and numeric representations require bounded runtime validation in a later implementation.

```ts
type Id<K extends string> = string & { readonly kind: K };
type ChainId = Id<'reviewed_chain_network'>;
type AssetId = Id<'asset'>;
type PairId = Id<'directional_pair'>;
type BindingId = Id<'market_binding'>;
type EvidenceId = Id<'evidence'>;
type RightsId = Id<'rights_decision'>;
type MechanismId = Id<'mechanism_epoch'>;
type ISO = Id<'original_utc_timestamp'>;
type SHA256 = Id<'received_bytes_sha256'>;
type IntegerText = Id<'canonical_unsigned_integer'>;
type DecimalText = Id<'canonical_nonnegative_decimal'>;
type Reason = Id<'sanitized_reason_code'>;
type Chain = {
 id: ChainId; namespace: string; reference: string;
 environment: 'mainnet' | 'testnet' | 'devnet';
 addressPolicyVersion: string; finalityPolicyVersion: string;
};

type Fact<T> =
 | { state: 'present'; value: T; evidence: EvidenceId[] }
 | { state: 'unknown' | 'unsupported' | 'unavailable' | 'withheld'
     | 'not_applicable'; value: null; reasons: Reason[]; evidence: EvidenceId[] };
type Asset = {
 id: AssetId; chain: ChainId; kind: 'token' | 'native'; address: string | null;
 decimals: Fact<number>; tokenProgram: Fact<string>;
 assurance: 'provider_asserted' | 'chain_validated';
 symbol: string | null; name: string | null; // display/search metadata only
 evidence: EvidenceId[];
};
type Pair = { id: PairId; chain: ChainId; base: AssetId; quote: AssetId };
type Binding = {
 id: BindingId; pair: PairId; integration: string;
 kind: 'launch' | 'bonding_curve' | 'pool' | 'orderbook' | 'provider_record';
 address: string; protocol: Fact<string>; program: Fact<string>;
 assurance: 'provider_asserted' | 'chain_validated';
 validFrom: ISO | null; validTo: ISO | null; evidence: EvidenceId[];
};
type BindingRelation = {
 from: BindingId; to: BindingId;
 kind: 'migrated_to' | 'downstream_market' | 'provider_alias';
 validFrom: ISO | null; validTo: ISO | null;
 assurance: 'provider_asserted' | 'chain_validated'; evidence: EvidenceId[];
};
type Recipient = {
 population: 'creator' | 'liquidity_providers' | 'eligible_token_holders'
  | 'fee_recipient' | 'referrer' | 'protocol' | 'unknown';
 eligibility: Fact<string>; exclusions: Fact<string>;
 entitlementBasis: Fact<'holding' | 'lp_position' | 'creator_designation'
  | 'configured_recipient' | 'other'>;
 claimRequired: Fact<boolean>; // no public wallet address/ownership assertion
};
type EconomicKind = 'trading_fee' | 'creator_fee' | 'holder_distribution'
 | 'incentive_emission' | 'buyback';
type Mechanism = {
 id: MechanismId; binding: BindingId; kind: EconomicKind;
 configurationEpoch: Fact<string>; validFrom: ISO | null; validTo: ISO | null;
 feeOrigin: Fact<'trade' | 'bonding_curve_trade' | 'creator_fee_allocation'
  | 'protocol_funding' | 'emission_schedule' | 'other'>;
 feeAsset: Fact<AssetId>; rewardAsset: Fact<AssetId>; recipient: Recipient;
 distributionRule: Fact<string>; // source-bound threshold/allocation semantics
 feeRate: Fact<{ numerator: IntegerText; denominator: IntegerText }>;
 fundingParent: MechanismId | null; // lineage, NOT an additional income stream
 verification: 'provider_settings' | 'chain_config_validated' | 'unverified';
 evidence: EvidenceId[];
};
type Finality =
 | { state: 'not_chain_validated'; slotOrBlock: null; blockHash: null }
 | { state: 'chain_validated'; policy: string; policyVersion: string;
     slotOrBlock: IntegerText; blockHash: string; evidence: EvidenceId[] };
type TimeBasis =
 | { kind: 'snapshot'; observedAt: ISO | null }
 | { kind: 'provider_rolling_report'; claimedSeconds: number;
     actualStartAt: ISO | null; actualEndAt: ISO | null }
 | { kind: 'lifetime'; startAt: ISO | null; reconciliationCutoff: ISO | null }
 | { kind: 'counter_interval'; requestedStartAt: ISO; requestedEndAt: ISO;
     actualStartAt: ISO; actualEndAt: ISO;
     providerStartAt: ISO; providerEndAt: ISO; actualSeconds: number;
     observations: number; maxGapSeconds: number; coveragePolicy: string;
     reconciliationCutoff: ISO | null }
 | { kind: 'validated_chain_interval'; startSlotOrBlock: IntegerText;
     endSlotOrBlock: IntegerText; startAt: ISO | null; endAt: ISO | null;
     watermarkEvidence: EvidenceId[]; completenessPolicy: string };
type Scope = {
 grain: 'token_aggregate' | 'launch' | 'pool' | 'program';
 bindingIds: BindingId[]; tokenAsset: AssetId | null;
 populationDefinition: string; configurationEpoch: string | null;
 inspected: number | null; providerReportedTotal: number | null;
 denominatorDefinition: string | null; complete: boolean; atomic: boolean;
 samplingMethod: string; cursorOrSnapshotEvidence: EvidenceId[];
};
type Evidence = {
 id: EvidenceId; provider: string; sourceUrl: string; sourceVersion: string | null;
 access: 'retained_receipt' | 'public_read' | 'chain_read'; httpStatus: number | null;
 capturedAt: ISO; providerGeneratedAt: ISO | null; observedAt: ISO | null;
 lastReportedPayoutAt: ISO | null; transportAgeSeconds: number | null;
 sourceAgeSeconds: number | null; bodySha256: SHA256;
 retained: { commit: string; path: string } | null;
 receiptTier: 'provider_report' | 'counter_observation' | 'validated_transfer';
 validationPolicy: string; finality: Finality; rights: RightsId;
};
type Rights = {
 id: RightsId; provider: string; reviewedAt: ISO | null;
 retention: 'unverified' | 'allowed' | 'denied';
 publicMetadata: 'unverified' | 'allowed' | 'denied';
 publicFinancial: 'unverified' | 'allowed' | 'denied';
 rawRedistribution: 'unverified' | 'allowed' | 'denied';
 commercialUse: 'unverified' | 'allowed' | 'denied';
 permittedFields: string[]; permittedPurposes: string[];
 permissionReceiptHash: SHA256 | null; ownerReviewRef: string | null;
 expiresAt: ISO | null; revokedAt: ISO | null;
};
type Amount = { asset: AssetId; raw: IntegerText; decimals: number };
type EconomicObservation = {
 id: Id<'immutable_economic_observation'>; pair: PairId;
 mechanism: MechanismId; kind: EconomicKind; scope: Scope;
 stage: 'assessed' | 'accrued' | 'pending' | 'claimed'
  | 'distributed_reported' | 'delivered_validated' | 'unknown';
 measurement: Fact<{ kind: 'amount'; value: Amount }
  | { kind: 'buyback'; spent: Amount; acquired: Amount;
      disposition: Fact<'inventory' | 'burn'> }>;
 time: TimeBasis;
 basis: 'provider_report' | 'provider_lifetime' | 'observed_counter_delta'
  | 'validated_transfers';
 quality: 'usable' | 'partial' | 'stale' | 'unavailable';
 evidence: EvidenceId[]; evaluatedAt: ISO; // never an observation timestamp
};
type MarketContext = {
 pair: PairId; binding: BindingId | null;
 bindingMatch: 'verified' | 'different_market' | 'unverified';
 metric: Fact<
  { kind: 'liquidity_value' | 'trade_volume'; currency: 'USD'; value: DecimalText }
  | { kind: 'price'; base: AssetId; quote: AssetId; quotePerBase: DecimalText }
  | { kind: 'price_performance'; base: AssetId; quote: AssetId;
      signedRatio: string; calculationPolicy: string }
 >;
 time: TimeBasis; evidence: EvidenceId[];
};
type PairEconomicsDraft = {
 schema: 'pair-economics-draft-1'; chainPolicy: Chain; pair: Pair; assets: Asset[];
 bindings: Binding[]; relations: BindingRelation[];
 mechanisms: Mechanism[]; observations: EconomicObservation[];
 marketContext: MarketContext[]; scope: Scope;
 evidence: Evidence[]; rights: Rights[];
 holderRealizedReturn: { state: 'withheld'; value: null;
   reason: 'entitlement_costs_cashflows_valuation_and_policy_not_established' };
};
```

## Normative eligibility, retention and publication rules

1. **Validate all references and assurance separately.** No dangling IDs, mixed chains, duplicate receipt/event IDs, impossible decimals, malformed/future source clocks, unrecognized configuration epochs, cyclic funding links or fabricated mint/program equivalence. Enforce economic kind/measurement compatibility (buyback legs cannot be holder payouts). Unknown metadata never grants capability. For the first implementation retain existing Solana validators and raw/decimal bounds; broader chain/precision support needs separate tests and approval.
2. **Keep units exact.** Validate nonnegative integer raw strings and verified decimals for amounts, exact rational rates with positive denominators and applicable bounds. Use BigInt/decimal strings, never floating-point raw recovery. Snapshot valuation in USD is separate from amounts in quote tokens. Unknown decimals may allow an identity label, not a formatted payout. Null, empty strings, missing fields and failures cannot become zero. `not_applicable` requires evidence that a property does not apply; `unsupported` describes SCOUT capability, not protocol economics.
3. **Bind each assertion to its real scope and accounting stage.** Settings are rules, not amounts. Creator accrued/claimable amounts are not settled creator receipts; provider-reported distributions are not independently delivered transfers. A fee-funded distribution and its fee parent cannot be summed as separate income. Do not manufacture fee rates from turnover or use emissions/buybacks as holder distributions. A buyback does not prove burn/disposition. An empty mechanism list means unknown unless capability/source evidence says otherwise.
4. **Preserve clocks and epochs.** Original receipt time/precision, provider generation, market observation, actual interval, last reported payout and chain slot/block/finality remain distinct. A last payout is not a reconciliation cutoff. A reported rolling 24h volume with unknown boundaries is context, not a verified historical interval. Store method versions and immutable source hashes; corrections are new observations with explicit supersession, never rewritten capture dates. No pre/post-migration or configuration-reset splice.
5. **Retain current gates exactly.** Provider Age/Source-Age, capture freshness, source-generation age, real gap/reset/precision checks and exact period alignment remain authoritative in their respective existing methods. Do not substitute scheduled hours for actual observations, lower evidence standards for a new venue, or use this draft's `quality`/`complete` flags as permission to skip validators. Existing Stonk catalog `complete=false`, `atomic=false` and scope bounds must remain so. Any future completeness claim must prove the specifically named population/period, never imply whole-venue coverage from a terminal cursor or registry response alone.
6. **Compare activity only after a dedicated gate.** Require the same exact reward asset/unit/decimals, accounting stage, compatible fee origin/recipient definition, same grain/counter basis, verified configuration epochs and market linkage appropriate to that grain, aligned actual/provider periods, credible freshness, non-degraded required inputs and known sampling scope. Different base memecoins may share a reward asset; that permits only eligible gross activity comparison, not holder/economic leadership. Missing boundaries, unequal lifetime start/cutoff, mixed quotes or pool/token-aggregate scope mismatch withhold the comparison. Do not let alternate-market context substitute for the economic market. No currency conversion or cross-chain bridge equivalence is implicit.
7. **Settlement is a separate proof.** `delivered_validated` requires successful transaction execution at reviewed chain-specific finality, exact mint/raw transfer, correct program/recipient interpretation and deduplication by transfer leg, not signature alone. Individual validated events do not prove a complete interval. Only validated watermark/cursor/coverage proof permits a chain-interval claim; unvalidated RPC gaps stay missing. No such reconstruction is newly available here; see [existing feasibility](../HISTORICAL_RESEARCH.md#historical-solana-reconstruction-feasibility--proposal-only).
8. **Apply rights per purpose and field, after scientific eligibility.** Unknown/denied/expired/revoked permission blocks the relevant output and may block new retention before acquisition. Permission receipts require owner review and exact provider/field/use scope; source accessibility is insufficient. Internal `present` can still produce public `withheld`. The public projection must remove financial values, sensitive recipient data and restricted raw bodies from HTML/RSC/JSON/images/exports/logs/caches, not merely hide them with CSS. All derived claims inherit the strictest applicable source rights. Do not cache a previously allowed public figure through revocation/expiry. Existing #75 metadata-only projection stays hard-gated; no env/query flag unlocks it.
9. **Do not compute holder return.** Aggregate events/counters, gross emissions, price performance and hypothetical equal splits cannot satisfy cost basis, actual eligibility/ownership, receipt valuation, fees and realized lot accounting. Raw recipient identities are not needed in this public draft. Hashing wallet IDs is not anonymization. A future attribution proposal would need separate privacy, source-rights and accounting approval; wallet connection/signing is outside this plan.

## StonkFun compatibility mapping, not a migration

| Existing input | Proposed mapping | Required withholding |
| --- | --- | --- |
| `PairGroup` exact quote mint/program/decimals | Quote universe selector; separate `Asset` identity | No automatic base decimals, pool/protocol attestation or underlying equity ownership |
| Catalog `PairToken.mint/poolMint/quoteMint` | Provider-asserted market binding plus directional pair; source reports preserved | Do not rename catalog pool as a chain-validated DEX pool; reject a different-quote market join |
| v2 `modeVerification` / mechanism evidence | Provider settings fact for the exact identity | No inferred fee rate, recipients' entitlement rules or transaction settlement |
| Parsed exact ledger lifetime | Token-aggregate `distributed_reported` / `provider_lifetime` with unknown start/cutoff | No 24h figure or split by pool; rights projection may still withhold quantity |
| Existing eligible Pulse distribution | `observed_counter_delta`, exact actual/provider periods and original policy/revision | No validated-transfers label, no relaxed precision/gap/alignment gate, no legacy-float/v2 splice |
| Reported catalog USD market values | Distinct market context with unknown observation time and reported rolling volume | No historical trend, pair-relative price return or tick timestamp from envelope time |
| Dossier highest-liquidity DexScreener pool / legacy v1 rewards | Separate legacy/provider context pending future validation | No strict zero, canonical-pool binding or authenticated provider-mint claim from request echo/coercion |
| #75 historical source index | Original IDs/hashes/date and metadata-only projection retained | No restricted lifetime/counter quantities, ranking or current fallback |

Only a later owner-approved, offline-tested mapper may implement this draft. Existing API schema versions, archived methods, readers and consumers remain intact; future public versioning is a separate decision. The draft is deliberately unable to represent an available holder-return metric.
