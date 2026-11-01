# C handoff — no C file changes or live trust enrollment

Base #278 and C's reviewed heads remain untouched. This is a proposed **new beta-only v3 trust migration**, not a replacement signature for #277's old global Ed25519 root. Neither v1 nor prototype v2 can satisfy v3; v3 is not fed to their old carriers. Existing native/Save/holder/issuer/source gates and effective Vercel Authentication stay in place.

Server-only entry: `consumer.mjs` / `.d.mts` → `researchBoundary({ publicTrust, nativeIdentity, clock, authority, consumerAuth })`. Public-only verification: `verifier.mjs`. Import graph has no provider SDK, signing key, PostgreSQL, filesystem or secret loader. C receives only its separate consumption MAC; never validator credentials, anchor key, database DSNs or root administration. App/project identity alone cannot approve or sign.

Input: an at-most64KiB v3 public envelope and one exact approved mint. Output is either `{status:'held',activate:false,sourceCalls:false}` or `{status:'reservation_source_off',activate:false,sourceCalls:false,receipt:{seq,head}}`. There is NO signing/enrollment/reset API on this boundary. Positive crypto/reservation evidence is not source activation. Do not turn either result into acquisition in this release.

`nativeIdentity()` is mandatory. It must derive actual platform-supplied repository/ref/commit/project/deployment/immutable HTTPS origin and environment, plus the build's independently commit-bound tree. Reuse the *checks* in the existing `betaPlatformIdentity` under C's separate review; its current branch pin/old v1 type is not silently broadened here. Do not pass configured target pins or request/header/body values as observed runtime identity. HMAC authenticates a consumption service client, NOT a Vercel runtime/deployment. Actual immutable Ready/edge/credential-scope verification remains required before any future integration GO.

The remote authority checks the configured approved target and the consumption MAC. It cannot independently observe Vercel's native runtime identity. Therefore a valid MAC or successful remote reservation is insufficient without C's mandatory native checks; neither service reports it as hosted deployment attestation.

The boundary verifies v3 against actual native identity, scope/rights/edge/expiry and both request proofs; makes ONE authenticated `/reserve` request to the configured authority origin; then rechecks identity/expiry after the await. The fixed SQL function rechecks STOP/revocation/remaining quotas and atomically debits. No retry/refund on unknown or late results. C must retain its own independent source-rights gate and late-response withdrawal. STOP prevents new reservations; no design can unsend an already transmitted, reserved network operation.

## Wire contract

- Owner-review `/prepare`: same-origin JSON `{record: <canonical v3 record>}` → exact SDK raw request. This is public proposal preparation, not permission.
- Owner-review `/submit`: same-origin `{signed:{url,body,stamp}}` → independent validator. Each request includes a fresh exact-origin owner WebAuthn proof; no owner session cookie is trusted as signing authority.
- Validator `/submit`: verifies owner proof before state/provider operations. Returns `{status:'approval_prepared_source_off',activate:false,sourceCalls:false,envelope:<public JSON string>}` only after dual proof, final Ed25519 verification and durable publish+anchor acknowledgment.
- Authority `/reserve`: `{request:{path:'/reserve',operationId:<UUID>,timestamp:<UTC ms>,envelope,mint},stamp:{role:'consumer',mac:<SHA256 HMAC>}}`. Domain `UNFARMD:BETA:SERVICE:1\0consumer\0` + canonical request.≤60s liveness. One UUID is never retried. The SDK/signing origin does not receive this app credential.
- Authority `/stop`: `{signed:{body,stamp}}`, body is exactly beta-stop/1 + PERMANENT_STOP + organization/epoch/time/nonce, with the owner's fresh required-UV proof. It cannot reset or unstop. Unknown response means STOP UNKNOWN and no acquisition.
- Owner `/anchor/read` and `/anchor/append`: server-only `anchor` MAC role/key, never `consumer`. These manipulate only independently retained continuity metadata and cannot enroll/sign grants.

The existing v1 carrier/header and256-byte mint-source body are unchanged. **Do not put a new v3 envelope through their decoder/header.** C's separately reviewed wrapper will need bounded private, in-memory envelope transport (≤64KiB), strip it before the unchanged producer's mint-only request, and preserve Host/Origin/intent protections. No client-storage, URL persistence, source packet or C UI change is implemented here.

Before C integrates: separately approve public-key provenance/trust enrollment, exact C SHA/tree/Ready tuple, real owner enrollment/Safari UV, actual SDK receipt compatibility, native Neon/role/concurrency/restore tests, current independent anchor custody, effective founder-only edge protection, Jupiter rights/attribution and finite acquisition budget. Public/production/source remain HOLD. No repeat of the accepted #265 USDC inspection is requested.
