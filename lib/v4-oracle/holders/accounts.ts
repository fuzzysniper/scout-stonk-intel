import 'server-only';
import { createHash } from 'node:crypto';
import { key, requireValue as need, strictBase64 } from '../onchain/bytes';
import { TOKEN_PROGRAM, TOKEN_2022_PROGRAM } from '../../onchain-mint/policy';
import { data } from '../../v4-helius-pilot/server/profile';
import { integer } from '../../v4-ca-intelligence/decimal';
import type { SampleAccount } from './contract';
export const hash = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex');
/** Numeric RPC bookkeeping is not financial arithmetic; validate original uint64 lexemes before Number rounding. */
export function accountBytes(value: unknown, lexemes: unknown, expectedProgram?: string): { bytes: Buffer; program: string } {
  need(data(value, ['data','owner','executable','lamports','rentEpoch'], ['space']) && data(lexemes, ['data','owner','executable','lamports','rentEpoch'], ['space']));
  const v = value as Record<string, unknown>, l = lexemes as Record<string, unknown>;
  need(v.executable === false && [TOKEN_PROGRAM,TOKEN_2022_PROGRAM].includes(v.owner as string) && (!expectedProgram || v.owner === expectedProgram));
  for (const k of ['lamports','rentEpoch']) need(typeof v[k] === 'number' && integer(l[k], (1n << 64n) - 1n) !== null);
  need(Array.isArray(v.data) && v.data.length === 2 && v.data[1] === 'base64'); const bytes = strictBase64(v.data[0]);
  if (v.space !== undefined) need(typeof v.space === 'number' && integer(l.space) === String(bytes.length));
  return { bytes, program: v.owner as string };
}
/** SPL165 layout; Token-2022 account type/TLV is orthogonal to mint type/TLV. */
export function decodeTokenAccount(bytes: Buffer, program: string, expectedMint: string, account: string, selectionAmountRaw: string, fieldPath: string): SampleAccount {
  need(bytes.length >= 165 && bytes.length <= 8192 && bytes.length !== 355);
  if (program === TOKEN_PROGRAM) need(bytes.length === 165);
  else need(program === TOKEN_2022_PROGRAM && (bytes.length === 165 || bytes.length >= 166 && bytes[165] === 2));
  const mint = key(bytes.subarray(0,32))!, owner = key(bytes.subarray(32,64))!;
  need(mint === expectedMint && (bytes[108] === 1 || bytes[108] === 2));
  for (const offset of [72,109,129]) need(bytes.readUInt32LE(offset) === 0 || bytes.readUInt32LE(offset) === 1);
  const types: number[] = [], unsupported: number[] = []; let offset = 166;
  if (program === TOKEN_2022_PROGRAM && bytes.length > 165) while (offset < bytes.length) {
    if (bytes.subarray(offset).every(b => b === 0)) break;
    need(bytes.length - offset >= 4 && types.length < 32);
    const t = bytes.readUInt16LE(offset), length = bytes.readUInt16LE(offset + 2); offset += 4;
    need(t !== 0 && ![1,3,4,6,9,10,12,14,16,18,19,20,21,22,23,24,25,26].includes(t) && !types.includes(t) && offset + length <= bytes.length); types.push(t);
    // ImmutableOwner has no balance effect. All other account extensions need independent review.
    if (t === 7) need(length === 0); else unsupported.push(t);
    offset += length;
  }
  return { account, mint, tokenOwner: owner, program, amountRaw: bytes.readBigUInt64LE(64).toString(), selectionAmountRaw,
    state: bytes[108] === 2 ? 'frozen' : 'initialized', native: bytes.readUInt32LE(109) === 1,
    extensionTypes: types, unsupportedExtensions: unsupported, accountDataSha256: hash(bytes), fieldPath };
}
