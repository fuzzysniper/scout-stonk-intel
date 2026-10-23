# Pre-migration launch intelligence — private/offline

Issue [#156](https://github.com/fuzzysniper/scout-stonk-intel/issues/156), based on main `bf555fbe672b5b16d68511f43787ff7b0f206ef5`. **No authentic launch alert yet. No acquisition adapter, subscription, activation, new route, database, job, wallet or posting implementation.** Independent of #154's migrated PumpSwap reserve probe and Agent B's production proof.

```sh
bash experiments/launch-intel/test.sh
bash experiments/launch-intel/demo.sh
# Open experiments/launch-intel/docs/private-brief.html locally. No server needed.
node experiments/launch-intel/browser-qa.mjs # existing local Playwright + /usr/bin/chromium required
```

The demo contains only invented local identities/events, clearly labeled throughout. Its dates are scenario clocks, not capture dates. One creation progresses from provisional → simulated finalized → one sampled trade; another candidate is rejected and unpriced. Nothing is a recommendation, investment score, eligible allocation, executable return, liquidity estimate or momentum signal.

REJECT means an evidence/scope or pre-migration-cohort rejection, never a token safety verdict. OBSERVE is permission to review the offline sample, not permission to acquire data, trade or publish.

## What works

- Bounded, deterministic pure replay; strict duplicate-key JSON; exact 32-byte mint/64-byte signature; exact u64/i64 decoding. No floating-point market math.
- Pinned **Pump bonding-curve program**, creation/legacy creation, selected trade/completion/migration event layouts. A small structural projection in `contract.json` records original IDL hash/revision. **Current complete event revision only**; old/truncated/appended layouts fail closed.
- Only top-level Pump instructions with direct Anchor event-CPI are supported. Check event authority and curve PDAs, instruction discriminator/account bindings, token program, quote binding and event type. Router/nested calls, log-only notifications, unknown events/instructions and ambiguous records are rejected. Partial coverage is explicit; this is not a network-wide scanner.
- `getTransaction`/`getSignatureStatuses` request/response IDs, exact requested signature, successful execution, slot and status checks. A provisional notification cannot establish identity. `RPC_REPORTED_FINALIZED` means exactly that, **not independently replayed chain consensus or an authentic source acquisition**. Offline imports remain unverified; fixtures remain synthetic.
- Original event Unix seconds, nullable RPC block time, first receipt and evidence availability clocks stay separate. No timestamp fallback. As-of replay excludes future evidence; immutable output retains rejections and source hashes. Missing status withholds finality; failed status, identity revisions/reorgs and out-of-order records reject. A >60s event/availability research window withholds further observation; this is a conservative offline rule, not a measured latency SLA.
- Native SOL retains the all-zero quote sentinel (unit lamports); it is not silently recast as an SPL mint. The reviewed non-native subset is exact USDC; token quote decimals are **NOT OBSERVED**. Other current Pump quotes, including pump-coin chains, remain outside this subset and are retained as rejected/unsupported, not falsely labeled SOL.
- Only finalized sampled trades after observed creation count. Raw quote/token sums remain atomic-unit strings; no full-volume, liquidity, unique-holder, buyer-quality or acceleration inference. Completion/migration closes this pre-migration cohort. Missing mint accounts mean controls/extensions remain unknown, including for Token-2022.
- Private human brief, action WAIT/research or REJECT; never ELIGIBLE. No durable/signed ledger claim: hashes preserve local input linkage but cannot prove capture time, permission or authenticity.
- Pure `socialDraft` produces **synthetic, founder-review-only** example text; unknown/missing disclosures, invalid candidates and unverified real imports are withheld. No actual public export, network client, posting or callout. Holdings/compensation/associated-token interests require explicit state-only disclosures; no wallet, size, private position or founder watch history is exported. Genuine social use needs separate privacy/policy review and approval.

## Existing-capability audit / reuse boundary

Audit date **2026-10-22 UTC**. See [source qualification and first capture plan](docs/SOURCES.md).

SCOUT's seven allowlisted reward mints are an existing, sparse cumulative-reward observation universe, not a creation feed. StonkFun bounded catalog/quote APIs and CARDS market receipts do not establish pre-migration launch coverage. Consumer MintFactsV1 is an exact-mint lookup, not discovery, and is not invoked here. #154 decodes migrated AMM reserves, not Pump creations. No production source is expanded.

Authorized read-only FuzzySniper code audit found pre-bond cohort capture, scheduled post-alert market snapshots, lifecycle exports, and an existing swap-source/momentum path. **Reuse these receipts first if the owner can export original signatures/slots/program/finality/clock evidence.** Source-code inspection did not establish live runtime/feed availability or complete creation coverage. Existing normalized records alone do not authenticate creations; missing clocks/fields must stay missing. Private source code/data is not copied into this public PR. The older public `gem-hunter-bot` checks DEX market pairs and sends Telegram messages; it is neither a finalized creation feed nor a safe dependency here. No bot is run or messaged.

`attachResearch(existing, replay(...))` accepts a read-only #150 recorded view only with zero live allocation, zero genuine priced outcomes/eligibility/NAV/return and all candidates still INSUFFICIENT EVIDENCE. It preserves the exact existing reference, returns **no journal commands**, and cannot import an event into #150. #152's synthetic causal evaluator remains separate; its wSOL-only OHLCV contract must not be populated with multi-quote creation events or invented prices. No draft branch is edited or required at runtime.

## Deliberate limitations

No real feed, coverage guarantee, permission determination, authentic finalized mint-account proof, holder/LP analysis, price path, alert delivery or momentum category. Reorg/failed evidence is retained and invalidates rather than replacing earlier evidence. A frozen offline result is not an externally timestamped, append-only private journal. Future acquisition needs a separate adapter/approval, owner-private storage and provider/retention scope. Do not commit real private observations to these demo files.

## Review / rollback

All changes are under `experiments/launch-intel/`; no root runtime/test runner/workflow changes. Run its focused tests separately; existing root CI does not discover this suite. Remove/revert this experiment to roll back; nothing is enabled to stop. Review-only draft, no merge approval implied. [Verification](docs/VERIFICATION.md) records actual checks and remaining gates.
