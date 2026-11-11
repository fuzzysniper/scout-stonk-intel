import { VERSION } from "./contract";
import { evaluateEvidence } from "./evaluate";
import { validateEvidence } from "./validate";
/**
 * Allowlisted diagnostic export, NOT a persistence format or privacy/rights waiver.
 * No raw/prose/quantity/source IDs/URLs are exported. Asset keys remain public identifiers.
 */
export function serializeRedacted(input: unknown, context: unknown): string {
  const result = evaluateEvidence(input, context), parsed = validateEvidence(input);
  if (!result.ok || !parsed.ok) return JSON.stringify({ version: VERSION, status: "invalid", sourceGo: false, code: "validation_failed" });
  const report = result.value;
  return JSON.stringify({
    version: VERSION, mode: report.mode, intendedUse: report.intendedUse, sourceGo: false, assetKey: report.assetKey,
    assetVerification: report.assetVerification, evaluatedAt: report.evaluatedAt,
    entries: report.assessments.map((a, index) => {
      const e = parsed.value.entries[index];
      return { ordinal: index + 1, category: a.category, state: a.state, freshness: a.freshness, reasons: a.reasons,
        clocks: e.clocks, coverage: { kind: e.coverage.kind, from: e.coverage.from, to: e.coverage.to, exhaustive: false }, verification: { tier: e.verification.tier, finality: e.verification.finality },
        representation: e.representation, origin: e.origin, rawSha256: e.reference?.sha256 ?? null };
    }),
    decisionAdmissibility: report.decisionAdmissibility,
  });
}
