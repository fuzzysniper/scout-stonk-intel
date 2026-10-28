import { isExactPublicKey } from "../onchain-mint/validation";
import { unavailable } from "./projection";
export { projectHeliusCapture, HELIUS_FACT_POLICY } from "./projection";
export type { Check, FactColor, FactState, HeliusCapture, SolanaFactProjectionV1, SolanaMintObservation, SolanaProvenance } from "./contract";

/** Intentionally not an RPC client. No activation/config/key/transport argument exists in this PR. */
export async function readHeliusFacts(mint: unknown) {
  return unavailable(mint, isExactPublicKey(mint) ? "disabled" : "invalid_mint");
}
