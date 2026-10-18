import type { MintFactsReader } from "./contract";
import { failure } from "./decoder";
import { boundedReader, newAdmission } from "./reader-core";
export type { MintFactsV1, MintFactsCore, MintSourceV1, MintAuthority, MintFailure, MintFactsReader } from "./contract";
export { decodeCapturedMintResponse } from "./decoder";
export type { CapturedMintResponse } from "./decoder";
export { isExactPublicKey } from "./validation";

const sharedAdmission = newAdmission();
function denied(options?: Readonly<{ developmentFeasibility?: true }>) {
  const env = (globalThis as typeof globalThis & { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV;
  return typeof window !== "undefined" ? "server_only" : options?.developmentFeasibility !== true || env !== "development" ? "disabled" : null;
}
/** No production profile exists. Explicit development opt-in still requires NODE_ENV=development. */
export function createMintFactsReader(options?: Readonly<{ developmentFeasibility?: true }>): MintFactsReader {
  const reason = denied(options);
  if (reason) return Object.freeze({ readMint: async (mint: string) => failure(mint, reason) });
  const reader = boundedReader({ transport: (url, init) => globalThis.fetch(url, init), now: () => Date.now(),
    monotonic: () => performance.now(), acquisition: "development_rpc" }, sharedAdmission);
  return Object.freeze({ readMint: async (mint: string) => { const reason = denied(options); return reason ? failure(mint, reason) : reader.readMint(mint); } });
}
