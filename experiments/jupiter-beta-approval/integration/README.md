# Jupiter beta signing integration — source OFF

Dependent implementation on #278 `7e13f73d8e8a5db8c274577c9d72f096b1ee50d2`. This extends that reviewed work with actual pinned SDK adapters and independently deployable service composition. It is not a second simulation app. The original lab remains an immutable historical test input; the new owner UI uses the real WebAuthn stamper and has no simulated approval buttons. **No real account, key, signer, database, hosted service, trust enrollment or source call exists as a result of this code.**

`release.json` ships external calls, database, trust enrollment and acquisition **false**, all origins/host/public pins **null**. Environment variables cannot lift these gates. The held entrypoint reads only its public listening port/runtime URL and returns held before credentials, SDK stamps, SQL or disk access. A future reviewed configuration requires exact public pins and both owner and validator proofs over the signer-only setup package. Seven-day maximum setup validity is rechecked on requests and provider/store operations; source acquisition remains unimplemented even with signer setup approved.

## Real implementation

- **SDK**: `@turnkey/http 6.7.0`, `@turnkey/webauthn-stamper 0.6.0`, `@turnkey/api-key-stamper 0.6.18`; exact isolated lockfile. Uses real `stampSignRawPayload`, `stampApproveActivity`, `stampGetActivity`, `stampGetOrganization`; never SDK dispatch or polling. Prepared bounded transport accepts only the exact first-party HTTPS host/path, refuses redirects, enforces3s/64KiB, and makes no retry. The shipped transport is disconnected. The actual SDK's HEX/NOT_APPLICABLE request bytes and P-256/WebAuthn stamps are exercised offline with ephemeral TEST keys and intercepted responses.
- **Policy**: real `CREATE_POLICY_V3` parameters, exact dedicated Ed25519 key/raw encoding/hash and AND consensus for both specified users AND credentials. Current organization metadata must contain exactly that one policy, the expected unexported/unimported Ed25519 key, both exact credentials and neither daily principal in root quorum. Extra/permissive policy, unknown credentials or key/mode drift deny. Provider policy does not parse our custom payload; independent semantic verification remains mandatory. Root administrators can bypass provider policies; root custody is a separate trust boundary.
- **Receipt**: accepts the SDK's actual activity/intent/result/vote structure, uses the provider-returned fingerprint unchanged, obtains one pending read and one final read, and verifies pinned Ed25519 `r || s`. Retains independently verified owner request and validator approval stamps over the exact same activity. Provider vote labels alone are not cryptographic proof of dual approval. Ed25519 has no recovery bit; absent/empty/zero `v` is accepted only with a valid64-byte Ed25519 signature. Unknown receipt shape fails closed. No App Proof/enclave-attestation claim is made.
- **Source clocks**: preserves provider-reported created/updated clocks with that qualifier, honest null if missing, local receipt time and SHA-256 of exact raw response bytes. Raw organization/receipt bodies (which may contain personal metadata) are processed in bounded memory, not logged or persisted; the public envelope contains a minimal projection, not emails/names. A hash without retained raw body is identification evidence, not independently replayable full raw evidence.
- **Owner**: independent HTTPS-origin page, fresh required-UV passkey, pinned RP/credential, frozen request display, one approval attempt, absolute liveness expiry, no polling/storage or automatic retry. Real browser passkey enrollment/Face ID/Turnkey acceptance are NOT established by the test authenticator. A human-readable display depends on owner control of this origin, its administrators and exact reviewed code.
- **Validator**: independent Node service composition. Before any provider call: owner proof, domain/version, complete deployment/tree/origin, rights/edge clocks, finite exact-mint scope, nonce and durable signature reservation. Five calls maximum: organization review → owner raw submission → pending read → validator approval → final read. Early completion, mixed fingerprint, lost ACK, expiry or missing proof withholds the grant. No retries/refunds/uncertain reclamation.
- **Durable authority**: real native `pg 8.23.1` adapter calls only fixed parameterized SECURITY DEFINER functions. Strict driver-source pins, verified TLS/SNI, mandatory SCRAM-SHA-256-PLUS and exact isolated database/login. Function-source fingerprints, role/no-owner/no-CREATE/no-table-access assertions fail closed. `schema.sql` is an **unexecuted installer**, parsed with PostgreSQL18 SQL/PLpgSQL WASM grammar only. No database has run it; real role, transaction, concurrency and TLS integration remain HOLD.
- **Independent continuity anchor**: owner-review service's persistent disk, outside Neon restore target. Append/fsync/0600/no-follow/exclusive lock, complete ordered log and current critical-state digest. SQL row lock checks both current independent anchor and reconstructed state/history before operations. Counter/STOP/policy/fence/nonce/usage rollback or history truncation is intended to deny. Unknown write/commit, unavailable anchor or a stale lock holds; no automatic repair/max-counter merge. A local queue reduces benign races; it is NOT a distributed store or source limiter. Real admission is PostgreSQL + independent current anchor.

Trust assumption: the anchor disk and public bootstrap are independently current and not rolled back with the database. Coordinated rollback/compromise of both is not detectable from two old self-consistent copies. Missing trustworthy current custody is NO-GO; restoration is not authorized. Existing v1/v2 recovery mechanisms, old Neon snapshot, source-admission functions, original global owner key and all C files are unchanged.

## Fixed bounds

| Limit | Hard behavior |
| --- | --- |
| Scope |1–4 explicit exact Solana mint strings; syntax/allowlist validation, not onchain mint qualification |
| Grant |≤10min, ≤4 uses, explicit per-mint cap, zero retries |
| Signer epoch |≤25 lifetime grant attempts; uncertain/failed attempts never refunded or automatically reset monthly |
| Provider |≤5 calls/grant, ≤125 calls/epoch; at most25 managed signatures through this path |
| Consumption |≤100 uses/epoch; unique operation IDs; reserve before any future separately approved source |
| Audit |512 ordinary entries + final STOP; no truncation to recover capacity |
| Services |one owner instance/disk, one control instance; no autoscaling or concurrent deploy/restore while operating |
| Source |ZERO acquisition in this release; no native, holders, Save, public display, wallets or trading |

## Verify locally (no SQL)

Publication is code-only: root `vercel.json` disables Git deployments for the exact successor branch `feat/278-turnkey-integration` only, using [Vercel's documented branch configuration](https://vercel.com/docs/project-configuration/git-configuration). Other branches retain their default behavior. No Vercel deployment command, hosted configuration mutation or Preview execution is part of this change. A canceled/suppressed Vercel check is not a deployed test result.

CI checks out the PR **head SHA**, uses read-only GitHub permissions, no secrets and a local-only network hook for test/build execution. The new finite reviewer freezes every original #278 byte/mode and pins all added implementation/workflow bytes. Older finite reviewers and browser tests run unchanged on their original immutable inputs; they are not widened to accept this new work. The focused successor tests run on the actual successor head. No root runner that might execute SQL is called. PostgreSQL grammar parsing and mocked driver transcripts are explicitly **not** PostgreSQL transaction, TLS or hosted integration tests.

```sh
npm ci --prefix experiments/jupiter-beta-approval/integration --include=dev --ignore-scripts
npm run test --prefix experiments/jupiter-beta-approval/integration
npm run build --prefix experiments/jupiter-beta-approval/integration
node tests/jupiter-approval-integration/parse.mjs
./node_modules/.bin/tsc --noEmit --strict --target ES2023 --module NodeNext --moduleResolution NodeNext --skipLibCheck tests/jupiter-approval-integration/types.mts
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/jupiter-approval-integration/playwright.config.mjs
```

The real service commands are `npm run owner`, `npm run validator`, `npm run authority` in this package; the fixed two-resource spec uses `entry.mjs control` to mount validator and consumption handlers together, apart from owner review. All commands ship held. A green `/health` with `setup_held` proves only the held process, not authentication, Neon, Turnkey or source connectivity. Do not deploy under this PR.

[Exact C boundary](C-INTEGRATION.md) · [Fixed resource/setup/cost package](SETUP.md) · [Unexecuted Render spec](render.yaml).
