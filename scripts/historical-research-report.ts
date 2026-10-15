/** Bounded offline validation. Emits metadata only, never restricted quantities. */
import {openSync,readFileSync,closeSync,fstatSync} from 'node:fs';
import {HISTORICAL_EVIDENCE_PATH,readHistoricalEvidence,publicHistoricalResearch} from '../lib/historical-research';
if(process.argv.length!==2)throw Error('Usage: historical-research-report (no network/options)');
let bytes:string|null=null;
try{
 const fd=openSync(HISTORICAL_EVIDENCE_PATH,'r');
 try{if(fstatSync(fd).size<=1024*1024)bytes=readFileSync(fd,'utf8');}finally{closeSync(fd);}
}catch{/* fixed reason below */}
const result=publicHistoricalResearch(readHistoricalEvidence(bytes));
process.stdout.write(JSON.stringify({kind:'offline_historical_research_metadata',...result},null,2)+'\n');
if(result.state!=='verified')process.exitCode=1;
