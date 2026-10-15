/** Explicit offline command only: bounded file read, stdout report, no network or writes. */
import { openSync,readSync,closeSync } from 'node:fs';
import { diagnoseRewardReceipts,DIAGNOSTIC_LIMITS } from '../lib/reward-source-diagnostics';
try {
 if(process.argv.length!==3)throw Error('usage');
 const fd=openSync(process.argv[2],'r'),bytes=Buffer.alloc(DIAGNOSTIC_LIMITS.bytes+1);let size=0;
 try {while(size<bytes.length){const n=readSync(fd,bytes,size,bytes.length-size,null);if(!n)break;size+=n;}}finally{closeSync(fd);}
 if(size>DIAGNOSTIC_LIMITS.bytes)throw Error('oversized');
 const value:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,size)));
 process.stdout.write(JSON.stringify(diagnoseRewardReceipts(value),null,2)+'\n');
}catch{process.stderr.write('Reward diagnostics rejected invalid, unreadable or oversized evidence.\n');process.exitCode=1;}
