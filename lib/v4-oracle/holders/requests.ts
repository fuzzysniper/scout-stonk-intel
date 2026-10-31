import 'server-only';
import { isExactPublicKey } from '../../onchain-mint/validation';
export const HOLDER_BOUNDS = Object.freeze({ maxAccounts: 20, maxCalls: 3, retries: 0, maxResponseBytes: 131072, maxAccountBytes: 8192, timeoutMs: 5000, batchMs: 20000, freshnessMs: 60000, blockAgeMs: 120000, maxSlotAdvance: 128 } as const);
export function largestRequest(mint: string): string {
  if (!isExactPublicKey(mint)) throw Error('invalid_mint');
  return JSON.stringify({ jsonrpc: '2.0', id: 260001, method: 'getTokenLargestAccounts', params: [mint, { commitment: 'finalized' }] });
}
export function accountsRequest(mint: string, accounts: readonly string[], minContextSlot: number): string {
  if (!isExactPublicKey(mint) || !Array.isArray(accounts) || accounts.length > 20 || !accounts.every(isExactPublicKey) || accounts.includes(mint) || new Set(accounts).size !== accounts.length || !Number.isSafeInteger(minContextSlot) || minContextSlot <= 0) throw Error('invalid_selection');
  return JSON.stringify({ jsonrpc: '2.0', id: 260002, method: 'getMultipleAccounts', params: [[mint, ...accounts], { encoding: 'base64', commitment: 'finalized', minContextSlot }] });
}
export function clockRequest(slot: number): string {
  if (!Number.isSafeInteger(slot) || slot <= 0) throw Error('invalid_slot');
  return JSON.stringify({ jsonrpc: '2.0', id: 260003, method: 'getBlockTime', params: [slot] });
}
