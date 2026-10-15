/** Server-side static reader. No provider calls, runtime cache or live fallback. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {HISTORICAL_EVIDENCE_PATH,readHistoricalEvidence,publicHistoricalResearch} from './historical-research';
export function historicalResearch(){
 let bytes:string|null=null;
 try{bytes=readFileSync(join(process.cwd(),HISTORICAL_EVIDENCE_PATH),'utf8');}catch{/* fixed public failure, no error/body leak */}
 return publicHistoricalResearch(readHistoricalEvidence(bytes));
}
