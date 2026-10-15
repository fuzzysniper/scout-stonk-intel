import Link from 'next/link';
import {historicalResearchPath} from '../lib/historical-research-index';
export function HistoricalResearchLink({mint,quoteMint}:{mint:string;quoteMint?:string}){
 const href=historicalResearchPath(mint,quoteMint);
 return href?<p className="historical-research-link">Dated research · 14 Oct 2026 · not current.<br/><Link prefetch={false} href={href}>View historical sources →</Link></p>:null;
}
