import { createBoundedJsonSource } from './history-source';
import { ARCHIVE_ROOT, MAX_ARCHIVE_BYTES, validateIndex, validateEdition, hex, graceAt, archiveReport } from './archive';
import type { Edition } from './archive';
import type { BriefReport } from './brief';
export const readArchiveIndex=createBoundedJsonSource(ARCHIVE_ROOT+'/index.json',validateIndex,(...args)=>fetch(...args),()=>Date.now(),256*1024);
// At most eight warm edition readers. No arbitrary origin, unbounded cache or immutable-success claim on outage.
let activeReads=0;
const readers=new Map<string,ReturnType<typeof createBoundedJsonSource<Edition>>>();
export async function readArchived(date:string,id?:string):Promise<{report:BriefReport|null;edition?:Edition;state:'available'|'absent'|'unavailable';sourceStatus:string}> {
 const index=await readArchiveIndex();
 if(!index.value || index.dataset.sourceStatus==='degraded')return {report:null,state:'unavailable',sourceStatus:index.dataset.sourceStatus};
 const entry=index.value.dates[date],selected=id??entry?.original;
 if(!entry||!selected||!hex(selected)||![entry.original,...entry.corrections].includes(selected))return {report:null,state:'absent',sourceStatus:index.dataset.sourceStatus};
 const key=date+'/'+selected;
 if(!readers.has(key)){
  if(readers.size>=8)readers.delete(readers.keys().next().value!);
  readers.set(key,createBoundedJsonSource(ARCHIVE_ROOT+'/'+key+'.json',validateEdition,(...args)=>fetch(...args),()=>Date.now(),MAX_ARCHIVE_BYTES));
 }
 if(activeReads>=4)return {report:null,state:'unavailable',sourceStatus:'capacity_limited'};
 activeReads++;
 let result;try{result=await readers.get(key)!();}finally{activeReads--;}
 if(!result.value || result.dataset.sourceStatus==='degraded'||result.value.id!==selected||result.value.body.date!==date)return {report:null,state:'unavailable',sourceStatus:result.dataset.sourceStatus};
 return {report:archiveReport(result.value,index.value),edition:result.value,state:'available',sourceStatus:result.dataset.sourceStatus};
}
export async function archiveHealth(now=new Date()) {
 const source=await readArchiveIndex(),index=source.dataset.sourceStatus==='degraded'?null:source.value,eligibleDate=new Date(now.getTime()-86400000-3*3600000).toISOString().slice(0,10);
 const dates=index?Object.keys(index.dates).sort():[],missing:string[]=[];
 for(let i=0;i<8;i++){const d=new Date(Date.parse(eligibleDate+'T00:00:00Z')-i*86400000).toISOString().slice(0,10);if(index&&!index.dates[d])missing.push(d);}
 return {state:!index?'source_unavailable':missing.includes(eligibleDate)?'awaiting_publication_or_review':'available',
  source:source.dataset,latestEligibleDate:eligibleDate,latestApprovedDate:dates.at(-1)??null,approvedDateCount:index?dates.length:null,
  missingEligibleDates:index?missing:null,gracePendingDate:new Date(now.getTime()-86400000).toISOString().slice(0,10),
  graceDeadline:new Date(graceAt(new Date(now.getTime()-86400000).toISOString().slice(0,10))).toISOString(),
  diagnostic:'No approved edition does not prove a failed attempt. Automation may be disabled, awaiting human review, or unable to read source. Inspect workflow artifacts.',
  attemptState:'unknown_until_workflow_review',attemptEvidence:'https://github.com/fuzzysniper/scout-stonk-intel/actions/workflows/research-archive.yml',
  capacity:{dates:366,editionsPerDate:4},retentionWarning:'Live snapshots retain at most 193 points per token; backfill is limited to eight days. Approved editions preserve full captured bytes.'};
}
