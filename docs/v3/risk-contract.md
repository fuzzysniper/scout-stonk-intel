# `unfarmd-risk/1` — manual risk and process review

Issue185 / charter183. Agent B owns only `lib/unfarmd-risk/**`, `tests/unfarmd-risk/**` and this document. Started from independently fetched main `9e5264b7edd3f37aeb35113ffb8b86aa8a50b7ec`; the draft PR records the final head/base and checks. A/B/C interface coordination is on [184](https://github.com/fuzzysniper/scout-stonk-intel/issues/184#issuecomment-6452263835), [185](https://github.com/fuzzysniper/scout-stonk-intel/issues/185#issuecomment-6452265118) and [186](https://github.com/fuzzysniper/scout-stonk-intel/issues/186#issuecomment-6452266311).

**Offline owner-authored planning, not portfolio advice, a recommendation, order or live quote.** Nothing is connected to the app, providers, brokerage, wallets, storage, SQL, source/STOP gates or infrastructure. There is no implicit approval or default decision. No public financial signal is introduced.

## Portable entry points

Import `lib/unfarmd-risk/index.ts`. It has no dependencies outside its own pure directory. All clocks are explicit; no current-time discovery, random ID generation, fetch, Node API or persistence. Every public entry accepts unknown data and fails closed categorically without echoing raw inputs/errors.

- `evaluateRiskPlan(input, {evaluatedAt}) → Evaluation`: explicit `PLAN|WATCH|PASS`, `recordable|blocked`, field/code/severity issues, optional calculation. Always `source:'owner_entered'`, `executionAuthorized:false`, `worstCaseLoss:null`. **Recordable means only this manual record/model is structurally acceptable.** It is not permission or evidence eligibility.
- `recordDecision(input, {id, recordedAt}) → {ok,event,issues}`: validates at that caller-supplied clock, clones and deeply freezes a detached **in-memory** snapshot. No disk/journal/database/export is written. IDs and clocks are owner reports, not signed or independently verified audit history.
- `reviewDecision({decision,execution:null|ExecutionEvent,review}, {evaluatedAt}) → ReviewResult`: validates exact event references and original clocks, evaluates reported rule adherence separately from a user-reported outcome. Returns no free-text, identity, financial amount, realized loss or ROI. `executionVerified:false`, `actualLoss:null`, `storage:'none'` always.

The exported TypeScript contract is authoritative. JSON must be a bounded plain data tree (≤1024 nodes, depth8, ≤16k total string characters, individual strings≤2000; no getters, prototypes, cycles, shared references, undefined, BigInt, symbols, unsafe/noninteger numbers or sparse arrays). Numeric **financial** fields are strings. Unknown schema fields are rejected, including in incomplete assumptions. Return issues have fixed codes/field paths; render all owner text as text, never HTML.

## Decisions and required fields

All records: `version:'unfarmd-risk/1'`, explicit `decision`, nonblank written `reason`. `PASS` needs no asset, prices, thesis, budget or affirmation. `WATCH` may retain known-field incomplete/unsupported assumptions as explicit warnings with sizing withheld. A WATCH/PASS risk warning never becomes an approved budget. Malformed structure, unknown fields, invalid linkage and invalid supplied top-level fields still block recording.

`PLAN` additionally requires:

- `asset:{label,assetKey:string|null}` is explicitly **owner-entered**. A ticker/label/null key remains unresolved; no existence or instrument verification follows. Key case is preserved exactly.
- `purpose:'invest'|'swing'|'speculative'`, owner-written `horizon`, `thesis`, `counterThesis`, nonempty `unknowns:string[]` (≤20 entries,500 characters each). `notes` is optional. No fabricated unknown or horizon is prefilled.
- `affirmation:{ownerEntered:true,lossMayExceedPlan:true,noExecution:true}`. Missing/false cannot be bypassed by a profitable outcome or an evidence link.
- Complete `assumptions` below, a valid priced invalidation/rationale, and a positive supported unit ceiling. An over-budget proposed quantity blocks PLAN without silently changing the owner's proposed units. A ceiling with `proposed:null` is an arithmetic envelope, not a chosen position/order.

### Assumptions

```ts
{
 instrument: 'long_spot', currency: 'USD',
 entry: {price:{currency:'USD',amount:string}, asOf:string, validForSeconds:number},
 invalidation: {kind:'price',price:{currency:'USD',amount:string},rationale:string},
 capital: {
  reference:{currency:'USD',amount:string},
  availableCash:{currency:'USD',amount:string},
  existingExposure:{currency:'USD',amount:string}
 },
 limits: {maxPlannedLoss:{currency:'USD',amount:string},maxAllocationBps:number},
 costs?: {
  entryFeeBps:number, exitFeeBps:number,
  entrySlippageBps:number, exitSlippageBps:number,
  fixedRoundTrip:{currency:'USD',amount:string}
 },
 costsAcknowledged:true,
 proposedUnits?:string
}
```

Only **unleveraged long spot-equivalent units, USD-denominated assumptions** are supported. USD is not USDC; no peg/FX conversion. No shorts/options/leverage, borrowed funds, event-only invalidation, missing/zero/negative price or zero/negative risk distance. Event invalidation can be retained in a WATCH draft as `{kind:'event',description:string}` but cannot size a PLAN. This version requires `0 < stop < entry`.

Owner-entered money/price/unit inputs use canonical unsigned decimal strings with at most9 whole digits. Capital, existing exposure, available cash, loss budget and fixed costs allow≤2 fractional digits; price/unit inputs allow≤9. No signs, whitespace, exponent/comma notation, numeric coercion or excess precision (even trailing zeros). Max input domain `999999999.999999999`; units are floored at `0.000000001`. A calculated unit ceiling is capped to that domain and flagged when binding. Derived proposed totals may be larger than the input domain; they remain exact strings and are explicitly flagged when over budget, never truncated/clamped into an acceptable proposal. These are software bounds, not recommended financial limits. Intermediate calculations use bounded BigInt exact arithmetic and serialize to strings; no floating financial math.

`maxAllocationBps` and fee/slippage bps are explicit integers0..10000. `reference` must be positive; available cash/existing same-asset exposure can genuinely be zero and must be explicitly supplied. Cash + existing exposure cannot exceed the entered reference capital. No balance/account API or missing-exposure default is inferred. Loss budget must be positive and≤reference capital. Portfolio reference/exposure are hypothetical owner assertions, not verified current holdings. V0 does not aggregate other positions, currency exposure, taxes or changing holdings.

`asOf`/all event clocks are exact calendar-valid UTC `YYYY-MM-DDTHH:mm:ss.sssZ`. `validForSeconds` is an explicitly chosen owner window1..604800, not a provider freshness claim. Future/expired references block PLAN; the exact endpoint is inclusive. Rereading/recording/reviewing cannot refresh the original reference clock. Horizon is retained prose, not a forecast or automatic timer.

### Exact conservative model

Let `e` be entered price, `s` entered stop, fee/slippage fractions be the entered bps/10000, and `F` be round-trip fixed costs. At9-decimal price precision:

1. `entryPerUnit = ceil(ceil(e × (1 + entrySlip)) × (1 + entryFee))`.
2. `exitPerUnit = floor(floor(s × (1 − exitSlip)) × (1 − exitFee))`.
3. `plannedDownsidePerUnit = entryPerUnit − exitPerUnit`.
4. `remainingAllocation = floorToCent(reference × allocationBps/10000) − existingExposure`.
5. Floor the unit count separately under `(lossBudget − F)/plannedDownsidePerUnit`, `(remainingAllocation − F)/entryPerUnit` and `(availableCash − F)/entryPerUnit`; take the minimum, also bounded by unit domain. Negative/zero residual budgets or no positive representable units block PLAN.

Full `F` is reserved against loss, cash and allocation **once per modeled position**, not per unit. Counting all costs inside allocation is intentionally conservative; allocation here is an acquisition cash envelope, not mark-to-market position valuation. Entry notional, modeled entry cash and planned loss round **up** to cents at display; sizing floors units, never rounds up. The calculation reports all tied binding constraints and separately preserves proposed sizing. The250-case independent inequality test proves ceilings fit all three budgets and one further unit quantum breaks a binding constraint.

Omitted costs require explicit acknowledgement and return `costs_omitted_not_estimated`; they numerically assume zero only as the owner's acknowledged scenario. An explicit group requires all five fields, including explicit zeros. They are assumptions, never estimated actual provider/exchange costs. Gaps, market discontinuity, absent liquidity, exit failure, taxes and unmodeled costs may exceed entered buffers. **Planned loss is not a guaranteed worst-case maximum.** No loss promise, ROI, probability, safety/risk score or predicted return is calculated.

## Evidence and `/desk` adapter proposal

Optional `evidenceRef:{version:'unfarmd-evidence/1',assetKey:string|null,evidenceIds:string[]}` is bounded nonsecret linkage only, not A's validator result or a source license. Evidence IDs≤20, unique, each≤80characters; exact key must equal the owner's asset reference. Wrong case/key/version blocks recording. No A module import or fact/price admission exists.

After independent interface/combined review, C may map its **session-only** strings directly into this contract, preserving blanks as missing rather than0. A's reviewed exact `assetKey` can be copied only with its explicit identity resolution state; ambiguous/null labels stay manual. Keep A's original evidence clocks/rights/unknowns and its admissibility result separate from B's risk model. Never use A's evaluation/retrieval clock as the owner's assumed-price observation time or treat any evidence eligibility as risk approval. A's `PLAN:'withheld'|'evidence_component_only'` concerns only the sourced-evidence component; withholding does not prohibit recording an independently labeled manual PLAN. Any later adapter must verify both exact key equality and selected evidence-ID agreement, not invent/admit IDs from this reference. Both components can be incomplete. C must show risk preview unconnected until integration; this PR does not import or overwrite A/C files or enable PLAN there. No hidden default limits, source calls, automatic quantity choice or decision promotion.

Minimal source-free no-entry input:

```json
{"version":"unfarmd-risk/1","decision":"PASS","reason":"I do not have enough evidence to participate."}
```

Financial examples in `tests/unfarmd-risk/fixtures.mjs` are prominently **INVENTED OFFLINE** arithmetic exercises, not actual securities, live prices or recommendations. Do not surface them as a genuine research result or a default order.

## Review events and hindsight

Decision event: `version,kind:'decision',id,recordedAt,plan`. Execution event: `version,kind:'execution',id,decisionId,occurredAt,recordedAt,mode:'paper'|'simulated'|'user_reported',asset,instrument:'long_spot',currency:'USD',units,entryPrice,stopPrice:string|null`. Review event: `version,kind:'review',id,decisionId,recordedAt,outcome:'gain'|'loss'|'flat'|'unknown'|'no_entry',evidenceChanged:boolean,lessons:string[]` (nonempty). Unique scoped IDs, matching decision references and valid reported chronology are mandatory. No review event can change the original snapshot.

Only a strictly earlier reported decision qualifies as `reported_before_entry`; equal/later timestamps do not. The review tests explicit PLAN, same reported asset, units≤owner-proposed quantity (or modeled ceiling when none chosen), entry not above assumption, preserved priced invalidation, original reference window at entry and reuses the exact risk model/capital/cost assumptions. Missing stop or unverifiable model stays unknown. A changed asset, larger position, lower invalidation or expired reference cannot be excused by reported gain. A reported loss with unchanged precommitment remains `reported_inputs_within_plan`; tests cover both contradictions and all outcomes. This is not complete risk compliance or actual fill/fee/portfolio verification. Subsequent gap/exit outcomes are not inferred.

`execution:null` means **no reported entry**, not proof no outside trade occurred; it permits PASS/WATCH/process success without market fields. Gain/loss without a reported execution, or `no_entry` with an execution, is inconsistent and rejected. `evidenceChanged` and lessons are captured but do not retrospectively rewrite adherence. No actual return amount, annualized metric, holder ROI, portfolio performance or P&L scoring is produced. Caller-supplied unsigned clocks can be falsified; genuine append-only audit/persistence would require separate review.

## Privacy/storage proposal — not implemented

Default is caller-owned session memory only. No cookies, localStorage, logs, analytics, export, file writing, identity/account link or server persistence. Refresh/close loses the draft unless a separately approved caller deliberately stores it. Do not put credentials, account numbers, personal data or provider raw payloads in free text/IDs; all user text remains potentially sensitive. `recordDecision` intentionally returns the owner's full snapshot in memory, while evaluation/review summaries omit free text.

For later owner approval only: choose encrypted owner-controlled storage, authenticated per-owner read/delete, no cross-user access or third-party telemetry, explicit opt-in export with redaction/inspection and deletion of all backup/export copies according to an approved retention policy. Proposed cap100decision sessions /30days **is not active or selected**; default remains zero retained sessions beyond memory. Establish rights, encryption/key management, actual backup/PITR retention and deletion semantics before any hosted persistence. Never call an unsigned JS snapshot durable/append-only audit history or assume logical deletion erases recoverable copies.

## Verification / review card / rollback

```sh
npm ci --ignore-scripts
bash tests/unfarmd-risk/run.sh
npx tsc --noEmit
npm run lint
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs npm run build
bash scripts/archive-tool.sh check origin/main
```

Focused suite compiles to a fresh temporary directory, tests both public validation and separate review/isolation boundaries, then removes that test build. No SQL/network needed. Existing root CI automatically covers regression/types/lint/build; **it does not discover this new standalone suite**. CI workflow changes are outside185 ownership. Explicitly run the focused command during review and add it to a future separately scoped integration workflow; do not pretend existing green CI includes it. No legacy test/guard is skipped or rebaselined.

- [ ] Review exact draft head, bounded decimal domain, cost/exposure conservatism, PASS/WATCH semantics and positive/negative tests.
- [ ] Accept the documented manual/unknown limitations; no financial recommendation, live quote or guaranteed loss claim.
- [ ] Independently review A/C adapter and storage/legal/public-use decisions before any product integration/release. No source or execution capability follows from this code review.

Before release, hold/close the draft. Later authorized integration can revert only this additive library/tests/doc through review; no migration, source, counter, credential, infrastructure or production state was changed. No merge, deployment, live trading/provider request, hosted SQL, credential access, paid service, source activation or wallet action is authorized.
