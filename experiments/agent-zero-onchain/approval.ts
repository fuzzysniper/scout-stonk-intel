import { LIMITS, SCOPE_HASH, keys, need, object, utc, freeze } from './policy';
import { strictJson } from '../consumer-mvp/evidence/strict-json';
const admitted = new WeakSet<object>();
export const ACK = 'I authorize only issue 153: two public Solana development RPC reads for the fixed PumpSwap example, with private local persistence; no Helius, Neon, production activation or trading.';
/** Owner acknowledgement, not cryptographic authentication or automatic permission. */
export function approve(bytes: Uint8Array, now: string) {
  need(bytes.length <= LIMITS.approvalBytes, 'APPROVAL_SIZE');
  const p = object(strictJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
  keys(p, ['version', 'approved', 'scopeSha256', 'reviewedCommit', 'approvedAt', 'expiresAt', 'evidenceDirectory', 'acknowledgement']);
  need(p.version === 'pumpswap-owner-approval/1' && p.approved === true && p.scopeSha256 === SCOPE_HASH && p.acknowledgement === ACK, 'OWNER_APPROVAL_REQUIRED');
  need(typeof p.reviewedCommit === 'string' && /^[a-f0-9]{40}$/.test(p.reviewedCommit), 'REVIEWED_COMMIT_REQUIRED');
  const approved = utc(p.approvedAt), expires = utc(p.expiresAt), at = utc(now);
  need(approved <= at && expires > at && expires > approved && expires - approved <= BigInt(LIMITS.approvalHours) * 3600_000_000n, 'APPROVAL_EXPIRED_OR_FUTURE');
  need(typeof p.evidenceDirectory === 'string' && p.evidenceDirectory.length > 0 && p.evidenceDirectory.length <= 1024, 'PRIVATE_DIRECTORY_REQUIRED');
  const result = freeze({ ...p, evidenceDirectory: p.evidenceDirectory, reviewedCommit: p.reviewedCommit, approvedAt: p.approvedAt as string, expiresAt: p.expiresAt as string }); admitted.add(result); return result;
}
export type Approval = ReturnType<typeof approve>;
export function requireApproval(p: Approval, now: string) { need(admitted.has(p) && utc(p.approvedAt) <= utc(now) && utc(p.expiresAt) > utc(now), 'ADMITTED_UNEXPIRED_APPROVAL_REQUIRED'); }
