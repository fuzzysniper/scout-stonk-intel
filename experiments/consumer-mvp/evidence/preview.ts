import { explainMint, listSupportedMints } from "./index";
import type { ExplainMintResult } from "./contract";

/** Build-time JSON previews, never a replacement observation or live provider response. */
export type PreviewFixture = Readonly<{
  kind: "retained_capture_projection" | "simulated_input";
  description: string;
  input: Readonly<{ mint: string; asOf: string }>;
  result: ExplainMintResult;
}>;

export function buildPreview(): readonly PreviewFixture[] {
  const asOf = "2026-10-17T12:00:00Z";
  return [
    ...listSupportedMints().map(({ mint }): PreviewFixture => ({
      kind: "retained_capture_projection",
      description: "Genuine retained October 14 capture, evaluated at a fixed preview clock; stale, metadata only. Not a new provider response.",
      input: { mint, asOf }, result: explainMint(mint, { asOf }),
    })),
    {
      kind: "simulated_input", description: "Synthetic unknown-input UX example; no source observation.",
      input: { mint: "11111111111111111111111111111111", asOf },
      result: explainMint("11111111111111111111111111111111", { asOf }),
    },
  ];
}
