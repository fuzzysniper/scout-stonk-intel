/** Client-safe documentary index. Contains no reward quantities or ranking. */
import manifest from '../docs/evidence/historical-research-manifest.json';
export const historicalIndex = manifest.records;
export function historicalResearchPath(tokenMint:string, quoteMint?:string):string|null {
 const entry=historicalIndex.find(r=>r.tokenMint===tokenMint && (quoteMint===undefined || r.quoteMint===quoteMint));
 return entry ? '/research/history#'+entry.tokenMint : null;
}
