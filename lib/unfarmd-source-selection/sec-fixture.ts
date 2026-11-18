/** SCOUT-owned OFFLINE proposal. This is NOT a verified SEC wire decoder or acquisition adapter. */
export const FIRST_SOURCE_PILOT = Object.freeze({
  version: "unfarmd-first-source/1",
  decision: "NO_GO",
  sourceGo: false,
  source: "sec-edgar-submissions",
  trigger: "one_deliberate_research_action",
  maximumAttempts: 1,
  maximumConcurrent: 1,
  retries: 0,
  redirects: 0,
  timeoutMs: 10000,
  maximumDecodedBytes: 2097152,
  providerCostCeilingUSD: "0.00",
  providerPriceVerified: false,
  rights: "unverified",
  retention: "unverified",
} as const);
export type FilingFixture = Readonly<{
  label: "SYNTHETIC_OFFLINE_NOT_OBSERVED";
  issuer: Readonly<{ cik: string; name: string }>;
  selection: Readonly<{ kind: "listed_equity"; mic: string; ticker: string; issuerCik: string; association: "user_asserted" }>;
  receivedAt: string;
  rawSha256: null;
  filings: readonly Readonly<{ accession: string; form: string; acceptedAt: string; filingDate: string; reportDate: string | null; primaryDocument: string }>[];
}>;
export type FilingPreview = Readonly<{
  version: "unfarmd-first-source/1";
  sourceGo: false;
  acquisition: "none_offline_only";
  status: "disabled" | "invalid" | "unsupported" | "synthetic_fixture" | "stale_fixture";
  reasons: readonly string[];
  preview: null | Readonly<{
    assetKey: string;
    assetVerification: "not_verified";
    issuerKey: string;
    issuerName: string;
    issuerAssociation: "user_asserted_not_security_master_verified";
    reference: Readonly<{ cik: string; accession: string; primaryDocument: string; rawSha256: null }>;
    form: string;
    amendment: boolean;
    clocks: Readonly<{ acceptedAt: string; filingDate: string; reportDate: string | null; receivedAt: string; evaluatedAt: string }>;
    scope: "newest_in_supplied_fixture_only";
    receiptFreshness: "fresh_fixture" | "stale_fixture";
    evidenceKind: "dated_filing_metadata_not_market_quote";
    sourceSchema: "scout_proposal_not_verified_provider_contract";
    rights: "unverified";
    retention: "unverified";
    uniqueFilings: number;
    duplicateRows: number;
  }>;
}>;
class Invalid extends Error {}
function reject(code: string): never { throw new Invalid(code); }
function object(v: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) reject("invalid_object");
  const r = v as Record<string, unknown>;
  if (Object.keys(r).some(k => !keys.includes(k))) reject("unexpected_field");
  return r;
}
function string(v: unknown, pattern: RegExp, max: number): string {
  if (typeof v !== "string" || v.length > max || !pattern.test(v)) reject("invalid_field");
  return v;
}
function day(v: unknown): string {
  const s = string(v, /^(?:19[7-9][0-9]|[2-9][0-9]{3})-\d\d-\d\d$/, 10);
  const ms = Date.parse(`${s}T00:00:00.000Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== s) reject("invalid_date");
  return s;
}
function utc(v: unknown): string {
  const s = string(v, /^(?:19[7-9][0-9]|[2-9][0-9]{3})-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/, 24);
  if (!Number.isFinite(Date.parse(s)) || new Date(s).toISOString() !== s) reject("invalid_clock");
  return s;
}
function cik(v: unknown): string {
  const s = string(v, /^[0-9]{10}$/, 10);
  if (s === "0000000000") reject("invalid_cik");
  return s;
}
const result = (status: FilingPreview["status"], reasons: readonly string[], preview: FilingPreview["preview"] = null): FilingPreview => ({ version: FIRST_SOURCE_PILOT.version, sourceGo: false, acquisition: "none_offline_only", status, reasons, preview });
/** No URLs, source policy, rights grant, clock invention, storage or I/O. Only explicit synthetic fixtures. */
export function previewSecFilingFixture(input: unknown, evaluatedAtInput: unknown): FilingPreview {
  if (input === null) return result("disabled", ["source_disabled"]);
  try {
    const evaluatedAt = utc(evaluatedAtInput);
    const r = object(input, ["label", "issuer", "selection", "receivedAt", "rawSha256", "filings"]);
    if (r.label !== "SYNTHETIC_OFFLINE_NOT_OBSERVED") reject("explicit_fixture_label_required");
    if (r.rawSha256 !== null) reject("no_authentic_source_hash_observed");
    const issuer = object(r.issuer, ["cik", "name"]), selection = object(r.selection, ["kind", "mic", "ticker", "issuerCik", "association"]);
    if (selection.kind !== "listed_equity") return result("unsupported", ["issuer_filing_scope_only"]);
    if (selection.association !== "user_asserted") reject("security_association_not_verified");
    const issuerCik = cik(issuer.cik);
    if (cik(selection.issuerCik) !== issuerCik) reject("issuer_identity_mismatch");
    const name = string(issuer.name, /^[^\u0000-\u001f\u007f-\u009f]{1,160}$/u, 160);
    if (/[a-z][a-z0-9+.-]*:\/\/|\b(?:bearer\s+\S+|(?:api[_-]?key|password|secret|authorization)\s*[:=])/i.test(name)) reject("credential_or_url_not_allowed");
    const mic = string(selection.mic, /^[A-Z0-9]{4}$/, 4), ticker = string(selection.ticker, /^[A-Z][A-Z0-9.-]{0,15}$/, 16);
    const receivedAt = utc(r.receivedAt);
    if (receivedAt > evaluatedAt) reject("future_received_clock");
    if (!Array.isArray(r.filings) || !r.filings.length || r.filings.length > 8) reject("bounded_fixture_rows_required");
    const rows = new Map<string, { accession: string; form: string; acceptedAt: string; filingDate: string; reportDate: string | null; primaryDocument: string }>();
    let duplicates = 0;
    for (const value of r.filings) {
      const row = object(value, ["accession", "form", "acceptedAt", "filingDate", "reportDate", "primaryDocument"]);
      const accession = string(row.accession, /^[0-9]{10}-[0-9]{2}-[0-9]{6}$/, 20);
      const form = string(row.form, /^[0-9A-Z/-]{1,10}$/, 10);
      if (!["10-K", "10-Q", "8-K", "10-K/A", "10-Q/A", "8-K/A"].includes(form)) return result("unsupported", ["form_outside_proposed_us_pilot"]);
      const acceptedAt = utc(row.acceptedAt);
      if (acceptedAt > receivedAt) reject("future_or_inverted_acceptance_clock");
      const primaryDocument = string(row.primaryDocument, /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.html?$/, 120);
      if (primaryDocument.includes("..")) reject("unsafe_document_reference");
      const normalized = { accession, form, acceptedAt, filingDate: day(row.filingDate), reportDate: row.reportDate === null ? null : day(row.reportDate), primaryDocument };
      const old = rows.get(accession);
      if (old) {
        if (JSON.stringify(old) !== JSON.stringify(normalized)) reject("conflicting_accession_metadata");
        duplicates++;
      } else rows.set(accession, normalized);
    }
    const ordered = [...rows.values()].sort((a, b) => a.acceptedAt === b.acceptedAt ? 0 : a.acceptedAt > b.acceptedAt ? -1 : 1);
    if (ordered[1]?.acceptedAt === ordered[0].acceptedAt) reject("ambiguous_newest_fixture_row");
    const latest = ordered[0];
    const stale = Date.parse(evaluatedAt) - Date.parse(receivedAt) > 86400000;
    return result(stale ? "stale_fixture" : "synthetic_fixture", ["synthetic_not_live", "source_disabled", "rights_unverified", "retention_unverified", "provider_docs_not_verified", "issuer_security_link_not_verified", "partial_recent_subset", ...(stale ? ["receipt_older_than_24h"] : [])], {
      assetKey: `listed_equity:${mic}:${ticker}`, assetVerification: "not_verified", issuerKey: `sec-cik:${issuerCik}`, issuerName: name, issuerAssociation: "user_asserted_not_security_master_verified",
      reference: { cik: issuerCik, accession: latest.accession, primaryDocument: latest.primaryDocument, rawSha256: null }, form: latest.form, amendment: latest.form.endsWith("/A"),
      clocks: { acceptedAt: latest.acceptedAt, filingDate: latest.filingDate, reportDate: latest.reportDate, receivedAt, evaluatedAt },
      scope: "newest_in_supplied_fixture_only", receiptFreshness: stale ? "stale_fixture" : "fresh_fixture", evidenceKind: "dated_filing_metadata_not_market_quote", sourceSchema: "scout_proposal_not_verified_provider_contract", rights: "unverified", retention: "unverified", uniqueFilings: rows.size, duplicateRows: duplicates,
    });
  } catch (error) { return result("invalid", [error instanceof Invalid ? error.message : "invalid_input"]); }
}
