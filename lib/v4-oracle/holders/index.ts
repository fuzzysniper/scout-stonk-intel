import 'server-only';
import { freeze, isExactPublicKey } from '../../onchain-mint/validation';
import { clock } from '../farming/validation';
import { projectFarmEvidence } from '../farming';
import { inspectHolderEvidence } from './decode';
import { data } from '../../v4-helius-pilot/server/profile';
import type { HolderProjection, HolderRiskInput } from './contract';
export { decodeHolderCapture, inspectHolderEvidence } from './decode';
export { largestRequest, accountsRequest, clockRequest, HOLDER_BOUNDS } from './requests';
export type * from './contract';
export const HOLDER_SOURCE = Object.freeze({ enabled: false, sourceGo: false, nativeReceiptBridge: false, liveAttempts: 0, retries: 0 } as const);
/** Protected-source authority, native receipts and method-specific durable admission belong to A. No substitute bootstrap. */
export function createHolderSource() { return Object.freeze({ read: async () => Object.freeze({ state: 'sources_off', evidence: null, reason: 'reviewed_native_receipt_and_holder_admission_required' } as const) }); }
export function projectHolderEvidence(input: HolderRiskInput): HolderProjection {
  let mint = '', now = '', evidence: unknown = null;
  try { if (!data(input, ['mint','evaluatedAt'], ['evidence'])) throw Error('invalid'); if (isExactPublicKey(input.mint)) mint = input.mint; clock(input.evaluatedAt); now = input.evaluatedAt; evidence = input.evidence; } catch { /* fail gray */ }
  const baseline = projectFarmEvidence({ mint, asOf: now });
  const result = inspectHolderEvidence(evidence);
  if (!result?.sample || !mint || result.sample.mint !== mint) return freeze({ state: result ? 'unavailable' : 'sources_off', findings: baseline, sample: null });
  const s = result.sample;
  try { if (clock(now) < clock(s.source[2].receivedAt) || clock(now) - clock(s.source[2].receivedAt) > 60000 || clock(now) - clock(s.sourceAt) > 120000) throw Error('stale'); }
  catch { return freeze({ state: 'unavailable', findings: baseline, sample: null }); }
  // A recorded response or caller's host/hash cannot become native evidence. Expose the sealed capture only as a candidate.
  // Fixtures may exercise the actual farm projector, explicitly labeled; recorded candidates remain GRAY in consumer hooks.
  const findings = s.kind === 'synthetic_fixture' && s.analysis ? s.analysis.findings.map(f => ({ ...f, explanation: 'SYNTHETIC OFFLINE FIXTURE. ' + f.explanation })) : baseline;
  return freeze({ state: 'captured_sample', findings, sample: s });
}
