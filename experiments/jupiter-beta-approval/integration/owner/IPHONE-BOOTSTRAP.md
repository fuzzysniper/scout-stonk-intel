# Owner-controlled iPhone bootstrap — preparation only

This supersedes the earlier **PC-required** assumption. A PC is not a cryptographic
prerequisite: Safari WebAuthn and WebCrypto can create the daily passkey and a
new, nonextractable, memory-only temporary API credential. No existing private key
is imported/exported. The independent owner origin remains separate from research.
The current daily UI does **not** mount the bootstrap helper or enroll anything.

## Supported primitives and exact boundary

- Turnkey's [account setup](https://docs.turnkey.com/get-started/quickstart) documents
  dashboard account/org setup and **My Profile → Create an API key**, including the
  alternative externally generated public-key registration flow (labelled CLI in
  that UI). The helper produces the same P-256 public-key format without a CLI.
- [Create API keys](https://docs.turnkey.com/api-reference/activities/create-api-keys)
  accepts a public key, exact user and `expirationSeconds`. The proposed maximum is
  **600 seconds**. Actual mobile dashboard availability of public-key input and
  expiry settings has **not** been observed. If either is unavailable, HOLD; do not
  use a long-lived credential, private-key paste, developer-console trick or an
  unsupported dashboard automation. Obtain provider-supported mobile registration
  confirmation before promising phone-only completion.
- [Integrating passkeys](https://docs.turnkey.com/features/authentication/passkeys/introduction)
  describes device-created, RP-bound credentials. `enrollmentAttestation()` uses the
  pinned SDK with ES256, resident credential and required UV at the FINAL owner RP.
  A console-domain passkey cannot be assumed valid at that RP.
- The pinned SDK's real `stampCreateAuthenticators()` prepares
  `CREATE_AUTHENTICATORS_V2` at `/public/v1/submit/create_authenticators`.
  `iphone-bootstrap.mjs` supplies a WebCrypto TK_API_P256 stamper for **one exact
  pre-reviewed daily-user enrollment**, with only a fresh activity timestamp allowed.
  The temporary private key is nonextractable, stays inside that browser closure,
  is forgotten after use/Discard and is never offered to a service or research app.
  Garbage collection is not a claim of physical memory erasure.

## Phone sequence after separate setup/signature approvals

1. Owner reviews exact code/build hash, final independent HTTPS owner origin,
   new beta organization, console admin identity, target **non-root** daily owner
   user ID and attestation digest. Existing global owner trust is unchanged. No
   research grant, managed Ed25519 signature or source request is involved here.
2. In a separately approved static bootstrap view on that owner origin (not
   implemented/mounted by this correction), explicitly create the daily ES256
   required-UV passkey using `enrollmentAttestation()` and a fresh32-byte challenge.
   Review its PUBLIC attestation and exact enrollment request. Do not store it in
   URLs, localStorage, analytics or third-party scripts. This is a real key/signature
   interaction and is **not authorized by this PR**.
3. `iphoneBootstrap()` validates that request's exact org/user, action, challenge,
   attestation origin/type and lifetime, then generates a NEW temporary WebCrypto
   P-256 key. Show only its public hex point, SHA-256 fingerprint and ≤10min deadline.
   Keep this tab alive. No server sees a private key.
4. Open the official Turnkey dashboard in another Safari tab and authenticate
   directly with the owner's provider-console passkey. Select the NEW beta org;
   register that exact public key under the separate setup administrator with
   expiry≤600s. Confirm org/admin/public fingerprint/expiry in the provider view.
   This is an explicitly approved temporary admin trust decision: it can carry
   root authority outside the local helper's restrictions. The helper's one-request
   allowlist is not a provider-enforced root restriction. No daily user becomes root.
5. Return to the owner tab. Call `review()` to show a fresh exact request after the
   dashboard step; then a deliberate action calls `prepare(theReviewedBody)` ONCE.
   This uses the real SDK, validates unchanged parameters and≤60s activity liveness,
   refuses rollback/expiry/reuse and returns the stamped request. It does **not**
   send it. A later separately reviewed, one-shot dispatch must allow only that
   exact HTTPS path/body, no redirects/retries/logging, and verify the returned
   enrollment activity and public authenticator independently before declaring
   enrollment. That dispatch/hosting is not installed by this draft.
6. Revoke the NEW temporary API key in the provider dashboard and independently
   verify revocation/expiry. Close/Discard the tab. If Safari evicts it, any reply
   is lost, consent is uncertain or the deadline passes: revoke first and HOLD;
   no retry, private-key recovery, automatic extension or trust enrollment follows.
7. Independently confirm the daily owner's exact authenticator public point,
   credential/RP/origin and non-root status; validator remains a DIFFERENT non-root
   principal. Perform separately authorized genuine Safari UV and two-approval
   acceptance, including denial after expiry/STOP. Only then review prospective
   beta trust enrollment. Source acquisition remains a different approval.

## Evidence and unresolved acceptance

Offline tests use ephemeral TEST WebCrypto keys and mocked public attestation.
They verify actual SDK URL/body, DER/P-256 signature math, one-shot restriction,
scope substitution, expiry, clock rollback and Discard. No browser enrollment,
account, console action, hosted API, private key import or genuine provider
signature was performed. This establishes executable preparation, **not** real
iPhone/Safari, dashboard UI or provider wire acceptance.

No new resource beyond the already proposed owner-review origin is needed. No
paid plan, OTP/email recovery feature or parent-account backend credential is
added. Current vendor metering and mobile public-key/expiry UI must be confirmed
before setup. If unsupported, report that precise phone-bootstrap blocker; do not
claim a PC is inherently necessary or weaken RP/UV/dual-approval checks to avoid it.
