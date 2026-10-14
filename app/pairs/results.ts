import type { PairToken } from './adapter';

export type SampleSort = 'name' | 'liquidity' | 'volume';
export const DEFAULT_SAMPLE_SORT: SampleSort = 'liquidity';

/** Scan precision only; greater precision, raw source links and dates remain in Details. */
export function screenUsd(value: number | null): string {
 if(value===null || !Number.isFinite(value) || value<0)return '—';
 if(value>0 && value<0.01)return '$'+value.toExponential(2);
 return '$'+new Intl.NumberFormat('en-US',{notation:value>=1000?'compact':'standard',maximumFractionDigits:value>=1000?1:2}).format(value);
}

/** Only reported USD snapshots participate; an absent value is never zero. */
export function marketValue(token: PairToken, metric: 'liquidity' | 'volume'): number | null {
 const market=token.catalog?.market;
 const value=market?.status==='reported_snapshot' ? market[metric==='liquidity'?'liquidityUsd':'volume24hUsd'] : null;
 return typeof value==='number' && Number.isFinite(value) && value>=0 ? value : null;
}

/** Reorder the fetched exact-mint sample, without mutating it or claiming wider coverage. */
export function sortSample(tokens: readonly PairToken[], quoteMint: string, sort: SampleSort = DEFAULT_SAMPLE_SORT): PairToken[] {
 const name=(a:PairToken,b:PairToken)=>a.name.localeCompare(b.name,'en') || a.symbol.localeCompare(b.symbol,'en') || a.mint.localeCompare(b.mint,'en');
 return tokens.filter(token=>token.quoteMint===quoteMint).sort((a,b)=>{
  if(sort==='name')return name(a,b);
  const av=marketValue(a,sort),bv=marketValue(b,sort);
  if(av===null)return bv===null?name(a,b):1;
  if(bv===null)return -1;
  return bv-av || name(a,b);
 });
}
