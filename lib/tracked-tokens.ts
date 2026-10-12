import configured from '../data/tracked-mints.json';
import { isSolanaMint } from './solana';
export type TrackedToken = {
 mint: string; name: string; symbol: string; quoteMint: string; quoteSymbol: string;
 poolMint: string; verifiedAt: string; source: string; discoverySource: string;
};
export function validateTrackedTokens(value: unknown): TrackedToken[] {
 if (!Array.isArray(value) || value.length < 1 || value.length > 10) throw new Error('Invalid allowlist');
 const seen = new Set<string>();
 for (const token of value) {
  if (!token || typeof token !== 'object' || !isSolanaMint(token.mint) || !isSolanaMint(token.quoteMint) || !isSolanaMint(token.poolMint) || seen.has(token.mint)) throw new Error('Invalid identity');
  if (typeof token.name !== 'string' || token.name.length < 1 || token.name.length > 80 ||
      ![token.symbol, token.quoteSymbol].every(v => typeof v === 'string' && /^[A-Za-z0-9._-]{1,32}$/.test(v)) ||
      typeof token.verifiedAt !== 'string' || !Number.isFinite(Date.parse(token.verifiedAt)) ||
      token.source !== 'https://www.stonkfun.xyz/api/public/v1/tokens/' + token.mint + '/rewards' ||
      token.discoverySource !== 'https://www.stonkfun.xyz/api/public/v1/tokens?limit=20') throw new Error('Invalid provenance');
  seen.add(token.mint);
 }
 return value as TrackedToken[];
}
export const trackedTokens = () => validateTrackedTokens(configured);
