# Synthetic Jupiter-beta approval prototype

**CODE ONLY · DRAFT · NOT A SIGNER · NO SOURCE ACQUISITION.** Based on immutable #277 `672229542d68b81caa955a16387fd92527f1bb9d`. No existing file, global owner key, #277 carrier, native/Save authority, SQL, collector, recovery verifier or C work is changed. Nothing here is imported by Next.js. Automatic Git Preview builds contain the unchanged source-held application, not this lab.

## Run locally

Node 24; no environment variables, accounts, credentials or service installation:

```sh
node experiments/jupiter-beta-approval/demo/server.mjs
```

Open **http://127.0.0.1:3899** on the same computer. Optional numeric port argument; the host is always loopback. Do not publish, tunnel or reverse-proxy this lab. Ctrl-C closes it. Choose a one- or two-mint TEST proposal, inspect its canonical record/hash, simulate Owner, then Validate & coapprove. Reserve a local test use; try replay, altered payload, expiry, revoke and permanent local STOP. There is no reset endpoint.

The labels mean exactly what they say: the server constructs WebAuthn-shaped assertions with ephemeral P-256 TEST keys. **No Face ID, physical passkey, owner authentication, Turnkey account, provider receipt or effective edge protection is demonstrated.** All three test actors are co-located for the demo; that is not production isolation. The keys are generated in memory only and never exported. The UI cannot accept a private key or real credential. No wallet, transaction or market data is present. USDC/SOL strings are scope examples; the other synthetic 32-byte identities in tests are not asserted to be real mint accounts.

## Component and trust boundaries

| Component | Authority in this prototype |
| --- | --- |
| `protocol.mjs` / `.d.mts` | Public-key verification and strict canonical v2 contract only. No signing, HTTP, environment or enrollment. |
| `policy.mjs` | Executable symbolic policy intent requiring BOTH exact distinct non-root users/credentials. **Not a deployable Turnkey create-policy request.** Alternate OR/one-vote/root/key/algorithm intents deny. |
| `validator.mjs` / `.d.mts` | Independently instantiable semantic validator. Reads a frozen simulated activity, verifies owner proof, checks scope/evidence/clocks, reserves nonce, asks a separate TEST credential adapter for its approval, verifies both approvals and raw signature, then publishes. It cannot generate keys/sign itself or administer revocation. |
| `local-ledger.mjs` / `.d.mts` | Explicit **in-process non-durable model**. Issuer: prepare/publish/uncertain; consumer: check/reserve/STOP; separate test admin: revoke grant/key epoch. No refund/reset/unstop. |
| `test-only/harness.mjs` | The ONLY signing/key-generation implementation; simulated provider and ephemeral TEST actors. Never imported by app/lib or packaged into Next. |
| `demo/` | Loopback-only harness. Strict Host/same Origin/intent/body bounds/CSP. Controls intentionally expose TEST administration to the local tester; they are not a production authentication interface. |

`unfarmd-jupiter-beta-authorization/2` signs `UNFARMD:JUPITER-BETA:PROTOTYPE:2\0` + exact canonical JSON with Ed25519, **without a prehash**. The envelope includes two independently verified P-256 approval proofs over the same raw request/activity, not just an Ed25519 signature. It binds the beta key/epoch; exact approver IDs, credential IDs and public policy commitment; repository/ref/commit/tree/project/deployment/immutable origin; synthetic rights/interpretation/attribution/receipt and edge/exemption digests; absolute session; nonce; finite sorted exact mints and budgets. Every success and denial has `activate:false` and `sourceCalls:false`.

Trust is constructor-supplied public context, never a key in the request. Only `test/scout`, a synthetic ref, `.invalid` origin and TEST project/deployment are accepted. There is no production trust pin to enroll. Tests verify both original v1 and new v2 positively before testing cross-protocol rejection. The original global SPKI SHA-256 remains `48a34ef44033ad8a6654116f211bbe9923abf05d01385c02d3713722f2c6c055`; these TEST signatures cannot satisfy #277.

The raw-signing request uses the documented `ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2`, HEX and `HASH_FUNCTION_NOT_APPLICABLE`. The **activity fingerprint algorithm and receipt shape are explicitly simulated**, not asserted as wire-compatible Turnkey SDK output. `TEST_WEBAUTHN` is not a real stamp. Fresh issuance requests have a 30-second bound; delayed human review creates a fresh request timestamp without renewing the record's absolute expiry. Owner and validator stamps bind the exact serialized bodies. Full record semantics are checked independently by validator AND consuming verifier. A negative control shows the raw mock signer can sign an invalid custom payload if deliberately bypassing semantic validation; the consumer still denies it. The mock does not disguise an absent provider-level custom-payload parser.

## Local budget and recovery contract

Finite scopes represent 1–4 exact mints and at most 4 uses, with explicit per-mint caps and zero retries; this does not expand the live one-USDC policy. `prepare` atomically reserves ID/nonce in one event loop before approval; concurrent callbacks cannot issue twice. `publish` commits the exact envelope hash; any uncertain completion permanently withholds that grant. `reserve` debits before a hypothetical outcome; failure has no refund/retry. Verification alone never auto-enrolls a signed grant. Issued state is rechecked on EVERY consumer verification/use for expiry, permanent STOP, revocation, epoch, committed hash and remaining budget. Disabling a signer alone does not revoke an already signed grant.

This map is **not** durable, cross-process, distributed, rollback-resistant or suitable for live budgets. A fresh empty ledger denies an old cryptographically valid grant. Monotone-clock rollback closes admission; audit-cap overflow STOPs without truncating. Real recovery must preserve all reserved/spent/uncertain IDs, nonce/operation uniqueness, epochs, revocations, complete ordered receipts, STOP and a trustworthy independent current anchor. Counter maxima and two old self-consistent snapshots are insufficient. No existing counters/history are reset or reused.

Before any future runtime integration, separately approve a durable adapter with serializable prepare/publish/reserve/revoke/STOP operations, fencing, bounded retention that never resurrects authority, trusted server time, authentication isolation, outage fail-closed behavior and independently anchored restore validation. No durable store or SQL is created here; missing durable authority is HOLD.

## Offline verification

```sh
npm ci --ignore-scripts
node --import=./tests/security114/local-only.mjs --test tests/jupiter-approval-prototype/{protocol,policy,validator,budget,http}.test.mjs
bash tests/jupiter-approval-prototype/legacy.sh
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/tsc --noEmit --strict --target ES2023 --module NodeNext --moduleResolution NodeNext --skipLibCheck tests/jupiter-approval-prototype/types.mts
npm run lint
npm ci --prefix experiments/consumer-mvp/web --ignore-scripts
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/jupiter-approval-prototype/playwright.config.mjs
node --test tests/jupiter-approval-prototype/scope.test.mjs
bash tests/jupiter-approval-prototype/replay.sh
```

Browser tests use local Chromium at 320/390/1280, axe AA, keyboard/200% reflow, no storage, expiry without refetch and six labeled TEST screenshots. They do not establish physical iPhone/Safari acceptance. Workflow also tests unchanged #277 admission, TAKE/source engines, production build and actual OFF artifacts, archive and immutable original reviewers. **Root `npm test` and PostgreSQL suites are not executed: this task prohibits SQL.** Historical PG/TLS results are ancestor evidence only, not new results.

[Separate setup, costs, acceptance and rollback checklist](SETUP.md). No approval or real signing authority is conferred by running this demonstration.
