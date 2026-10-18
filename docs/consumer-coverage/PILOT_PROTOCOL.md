# Minimal source pilot protocol v1 — inactive

Boundary: `consumer-source-pilot/1`, **activation disabled, transport null, actual requests zero**. Code is the offline tool `experiments/consumer-mvp/evidence/tools/pilot-protocol.mjs`; types are `pilot-contract.ts`. It reuses #97's semantic validator, not a new provider parser or public endpoint. Original `explainMint`, its three identities, source dates and contract are unchanged. No production module imports this tool.

## One approved mint, three receipts

The first real execution, if separately permitted and approved, is **SI/NVDAX only**, one process/run, three sequential GETs, **no retry**:

| Order | Fixed official source | Maximum body |
| --- | --- | --- |
| 1 | `https://www.stonkfun.xyz/api/public/v1/pairs` | 524,288 bytes |
| 2 | Same origin, `/api/public/v1/tokens?sort=marketCap&page=1&pageSize=25&quoteMint=Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh` | 131,072 bytes |
| 3 | Same origin, `/api/v2/tokens/DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP/rewards` | 32,768 bytes |

Total **688,128 decoded body bytes**, ≤3 seconds each and ≤9 seconds including the complete batch, one in-flight batch, cold admission no more than once per 60 seconds. **The initial one-use session grants only three requests total**, so cooldown never authorizes another proof. No paging, alternate pool, candidate enrollment, price/payout endpoints, logos, wallet accounts, browser polling or backfill.

The in-memory rehearsal atomically reserves all three slots before reviewing receipts; failed/ambiguous runs remain spent. There is no reset/retry API. A second cold concurrent admission is denied. Admission counters and prior-clock state live in one closure; supplied `asOf` is a test clock, not live attestation. Before any actual run, enforce the one-use grant across runner restart/replicas in the owner-controlled execution record, or keep acquisition disabled. The offline closure is not distributed admission and has no live clock/timer enforcement.

## Trusted acquisition and strict acceptance

Actual source authenticity must come from **controlled server-side HTTPS acquisition**, not a browser/uploaded transcript, copied URL, hash, caller `tlsVerified`, or `approved` flag. A future reviewed transport must mint a process-private acquisition receipt only after validating system CA/hostname/TLS, fixed exact HTTPS origin, no redirect, approved source path, full bounded response and actual monotone elapsed/UTC acquisition clocks. Do not disable TLS, bypass the environment proxy/trust policy or accept client URLs/headers. Bind the complete body SHA-256, byte count, original provider/capture clock, runner revision and one-use grant/run ID; bind receipt intervals to that admission. The local operator must verify the capture/run provenance, not treat a returned JSON assertion as a trust root.

No provider response-signature scheme was verified. HTTPS-authenticated provider JSON can be a provider statement; it is **not** a provider-signed settlement attestation. Do not require or invent an undocumented provider signature. Unsigned uploads/self-declared origin fail authenticity; replayed hashes or prior receipts cannot become a newly acquired source. Hashes alone prove neither origin nor rights. This PR contains **no trusted transport, private key, signature verifier, real permission receipt or live acceptance result**.

Strict checks retained from #97: exact original Solana base/quote mint, selected catalog pool, name/ticker disambiguation, reward mode, program and quote decimals; root/envelope version shape; no unknown config/epoch/program version drift; duplicate-key/depth-safe JSON; no partial/redirect/error transport; independently bounded cache age and source-generated/capture clocks (≤600 seconds, zero future skew), preserving original microsecond strings. A fresh fetch never substitutes for an old provider clock. No mode/unit/epoch continuity or payout flow is inferred. Missing/null/simulated zero quantities remain withheld. Global/sample completeness is never asserted.

Future actual transport also needs real abort/stream/header limits, decoded-byte/decompression caps and a trustworthy clock-health check; the rehearsal tests supplied timing, not network timers. 429/503/timeout, uncertain response, identity/rights/integrity/schema/epoch failure or clock regression opens a **terminal circuit** for the grant, invalidates cache and requires owner review. Retry-After is not shortened or used to wake an automatic retry. Do not start later requests after a failed earlier response. Do not serve stale current facts after any circuit/rights failure.

## Rights-specific projection and cache

The new helper accepts **explicitly named offline policy/acquisition fixtures only**. Their positive flags simulate a policy decision; they are not permission or TLS evidence. Successful rehearsal still returns `rightsVerified: false`, `sourceAuthenticity: not_attested`, `providerSignatureVerified: false`, `publicExplanation: null`, null financial/holder-return fields and `preview.use: offline_fixture_only`. This cannot publish, refresh or enroll anything.

| Independently scoped field group | Permissible private test projection; all other groups null |
| --- | --- |
| `tokenIdentity` | Solana network + exact base mint |
| `labels` | Source-matched token name/ticker |
| `pair` | Exact quote mint/label/decimals and selected pool identifier |
| `rewardMode` | Provider-reported reward **setting**; no settlement/entitlement claim |
| `provenance` | Fixed official URLs, original provider/capture clocks, recomputed body hashes |

All groups require separate access/transient-processing scope and validity for the exact mint. Public/commercial use and attribution must be covered by the real permission artifact before any live consumer projection. A successful fixture does not substitute for that external decision. Prices, totals, market figures, wallet/payout populations, holder returns, source bodies and arbitrary provider fields are **not grantable through this protocol**. Images/links are not automatically read. Nonfinancial does not mean licensed.

The private rehearsal cache holds only the explicitly projected metadata. Its key binds the exact mint and every simulated field/retention/validity scope. A narrowed/changed scope cannot reuse a broader cache; revoked/expired scope invalidates it, including pending proof. Effective expiry is the earliest of permission expiry, approved TTL ≤600 seconds, and **each original provider clock +600 seconds**, rounded down. Zero TTL means no cache. Warm reads reserve no extra slots; expired/failed cache cannot refresh automatically. Raw responses are not stored by the protocol; persistent raw retention is zero.

## Acceptance evidence, not activation

`bash experiments/consumer-mvp/evidence/test.sh` executes original receipt/hash reproduction, #97 candidate validation, then the new 24-case pilot suite. New cases use genuine retained metadata for expected stale rejection and explicitly synthetic fixtures for policy/transport mutations; no genuine capture is retimed. They test missing/invalid/stale/429/503/timeout, wrong quote/pool/mode/units, duplicate SI identity, nested epoch/source drift, unsigned data, exact body digests, replay, bounds, field leakage, circuits, cache and unchanged default support.

Before shipping anything current, the owner must have a genuine scoped permission record **and** a separately approved isolated run proving authentic origin, actual rate/timer/stream bounds, exact source checks and current source clocks. Then review a fresh consumer contract with Agent A; never change the original captures to today's dates. No browser/device/live endpoint result or actual permission is claimed here. See [owner actions](OWNER_ACTIONS.md) for the shortest sequence and rollback.
