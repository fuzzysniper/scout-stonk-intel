import {isExactSolanaMint} from '../consumer-mvp/evidence/guards';

export const directions = ['escape', 'squad', 'quiet'] as const;
export type Direction = typeof directions[number];
export function directionFrom(value: string | null): Direction {
  return directions.find(direction => direction === value) ?? 'escape';
}
export type AddressState = 'idle' | 'empty' | 'invalid' | 'address_only';
/** Reuses the production exact-byte guard. Format acceptance never means existence. */
export function addressState(raw: string | null, duplicate = false): AddressState {
  if (duplicate) return 'invalid';
  if (raw === null) return 'idle';
  if (raw === '') return 'empty';
  return isExactSolanaMint(raw) ? 'address_only' : 'invalid';
}
export function studyPath(direction: Direction, mint: string | null): string {
  const params = new URLSearchParams({direction});
  // Never publish an invalid input, pasted phrase, URL or ticker into a share link.
  if (addressState(mint) === 'address_only') params.set('mint', mint!);
  return '/?' + params.toString();
}
