import type { PairQuote, PairQuoteRegistry } from './registry';

// Candidate identities, never fallback registry data. Each button requires a
// successful exact-mint registry response before it can select anything.
export const PRESET_CANDIDATES = [
 { symbol:'NVDAX', mint:'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh' },
 { symbol:'GLDX', mint:'Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re' },
 { symbol:'STONK', mint:'6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx' },
 { symbol:'SPCXX', mint:'Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8' },
] as const;
export type VerifiedChoice = {quote:PairQuote;registry:PairQuoteRegistry};
export function verifiedPreset(candidate:typeof PRESET_CANDIDATES[number], registry:PairQuoteRegistry):VerifiedChoice|null {
 const quote=registry.quotes[0];
 if(registry.status!=='available' || registry.search.mint!==candidate.mint || registry.search.query!=='' || registry.search.offset!==0 || registry.quotes.length!==1 || registry.dataset.coverage.matchedCount!==1 || quote?.quoteMint!==candidate.mint || quote.quoteSymbol!==candidate.symbol)return null;
 return {quote,registry};
}
