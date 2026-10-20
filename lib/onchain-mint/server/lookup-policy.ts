import "server-only";
/** New durable epoch. Neither this gate nor its SQL ever rearms the old USDC canary. */
export const LOOKUP_POLICY = "scout-helius-mint/lookup-v1";
export const LOOKUP_PROOF = Object.freeze({
  mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  intent: "exact-mint-proof-v1",
});
export type LookupApproval = Readonly<{
  phase: "disabled" | "proof" | "public";
  storeHost: string; vercelProjectId: string;
  notBeforeMs: number | null; expiresAtMs: number | null;
}>;
/** Source-code approval ONLY. Credentials alone cannot authorize a request.
 * Proof → public is a SECOND review after authentic evidence, retaining the same counters.
 */
export const LOOKUP_APPROVAL: LookupApproval = Object.freeze({
  phase: "disabled",
  storeHost: "ep-flat-band-b5fp4ls8.c-7.us-east-2.aws.neon.tech",
  vercelProjectId: "prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q",
  notBeforeMs: null, expiresAtMs: null,
});
export const LOOKUP_PROFILE = Object.freeze({
  policy: LOOKUP_POLICY, acquisition: "production_rpc" as const, leaseMs: 15000, storeTimeoutMs: 2000,
});
