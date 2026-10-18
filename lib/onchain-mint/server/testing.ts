import "server-only";
import { offlineHandler } from "./handler";
import { syntheticService, type SyntheticDependencies } from "./service";
/** Test constructor only. No native fetch fallback or environment credential loader. */
export function createSyntheticMintApi(input: SyntheticDependencies & Readonly<{ origin: string; label: "SYNTHETIC_OFFLINE_ONLY" }>) {
  if (input.label !== "SYNTHETIC_OFFLINE_ONLY") throw new Error("synthetic_label_required");
  const url = new URL(input.origin);
  if (url.origin !== input.origin || url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) throw new Error("invalid_test_origin");
  return offlineHandler(input.origin, syntheticService(input));
}
