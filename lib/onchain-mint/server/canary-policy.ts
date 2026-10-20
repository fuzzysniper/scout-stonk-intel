import "server-only";
/** Circle's mainnet Solana identifier, checked 2026-10-20. Not a claim about current state/backing.
 * https://developers.circle.com/stablecoins/usdc-contract-addresses
 */
export const USDC_CANARY = Object.freeze({
  mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  intent: "usdc-read-once-v1",
  // Absolute review window: no rolling expiry, daily refill, deployment or process reset.
  notBeforeMs: Date.parse("2026-10-20T00:00:00.000Z"),
  expiresAtMs: Date.parse("2026-10-21T00:00:00.000Z"),
  maxLeaseId: 1,
  role: "scout_mint_app", database: "neondb",
});
export const CANARY_DEPLOYMENT_HOST = /^scout-stonk-intel-[a-z0-9]{6,64}-riskledgerapp\.vercel\.app$/;
export function canaryWindow(now: number, window: Readonly<{notBeforeMs:number;expiresAtMs:number}> = USDC_CANARY): boolean {
  return Number.isSafeInteger(now) && Number.isSafeInteger(window.notBeforeMs) && Number.isSafeInteger(window.expiresAtMs) &&
    window.notBeforeMs>0 && window.expiresAtMs>window.notBeforeMs && window.expiresAtMs-window.notBeforeMs<=86400000 &&
    now >= window.notBeforeMs && now < window.expiresAtMs;
}
