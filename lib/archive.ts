/** Self-contained, reproducible append-only editions. No network, clock mutation or filesystem writes. */
import { createHash } from 'node:crypto';
import { buildBrief, BRIEF_METHOD, validBriefDate } from './brief';
import type { BriefReport, BriefRow } from './brief';
import { parseHistoryTimestamp } from './history';
import { summarizeHealth } from './data-health';
import { validateTrackedTokens } from './tracked-tokens';
import type { TrackedToken } from './tracked-tokens';
import type { Dataset } from './history-source';
import type { Audit } from './collector-diagnostics';
import { isSolanaMint } from './solana';
export const ARCHIVE_METHOD = 'archive-utc-day-v1';
export const GRACE_MS = 3 * 3600000;
export const MAX_ARCHIVE_BYTES = 4 * 1024 * 1024;
export const MAX_ARCHIVE_DATES = 366;
export const MAX_EDITIONS = 4;
export const ARCHIVE_ROOT = 'https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/brief-archive';
export const hex = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
export function canonical(value: unknown): string {
 if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
 if (value !== null && typeof value === 'object') return '{' + Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,v])=>JSON.stringify(key)+':'+canonical(v)).join(',') + '}';
 const result = JSON.stringify(value); if (result === undefined) throw Error('invalid_value'); return result;
}
export function graceAt(date: string) { return Date.parse(date+'T00:00:00Z') + 86400000 + GRACE_MS; }
export type ArchiveIndex = { schema: 1; dates: Record<string,{ original: string; corrections: string[] }> };
export type EditionBody = {
 schema: 1; date: string; method: typeof ARCHIVE_METHOD; calculationMethod: typeof BRIEF_METHOD;
 eligibleAt: string; inputCommit: string; inputCommittedAt: string; source: string;
 snapshotRevision: string; allowlistRevision: string; snapshotBase64: string; allowlistBase64: string;
 correction: { parent: string; notice: string } | null;
 headline: string; findingCount: number; verifiedCount: number; rows: Omit<BriefRow,'evidence'>[];
 limitations: string[];
};
export type Edition = { id: string; body: EditionBody };
function object(v: unknown): v is Record<string, unknown> { return v !== null && typeof v === 'object' && !Array.isArray(v); }
export function validateIndex(value: unknown): ArchiveIndex {
 if (!object(value) || value.schema!==1 || !object(value.dates) || Object.keys(value.dates).length>MAX_ARCHIVE_DATES || Object.keys(value).some(k=>k!=='schema'&&k!=='dates')) throw Error('invalid_index');
 const used = new Set();
 for (const [date,row] of Object.entries(value.dates)) {
  if (!validBriefDate(date) || !object(row) || !hex(row.original) || !Array.isArray(row.corrections) || row.corrections.length>=MAX_EDITIONS || row.corrections.some(id=>!hex(id)) || Object.keys(row).some(k=>k!=='original'&&k!=='corrections')) throw Error('invalid_index');
  for (const id of [row.original,...row.corrections]) { if(used.has(id))throw Error('duplicate_edition');used.add(id); }
 }
 return value as ArchiveIndex;
}
function decode(value: unknown, limit: number) {
 if (typeof value !== 'string' || value.length>Math.ceil(limit/3)*4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw Error('invalid_evidence');
 const bytes=Buffer.from(value,'base64');if(bytes.length>limit || bytes.toString('base64')!==value)throw Error('invalid_evidence');return bytes;
}
function parseStore(bytes: Buffer): Record<string,unknown[]> {
 const value:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(!object(value)||Object.entries(value).some(([mint,rows])=>!isSolanaMint(mint)||!Array.isArray(rows)))throw Error('invalid_snapshot');
 return value as Record<string,unknown[]>;
}
function facts(snapshot: Buffer, allowlist: Buffer, date: string, commitAt: string) {
 const store=parseStore(snapshot),tokens=validateTrackedTokens(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(allowlist)));
 const end=Date.parse(date+'T00:00:00Z')+86400000;
 // Preserve all evidence bytes. Only records through the historical target enter its calculation.
 const scoped=Object.fromEntries(Object.entries(store).map(([mint,rows])=>[mint,rows.filter(row=>{
  const time=object(row)?parseHistoryTimestamp(row.observedAt):null;
  if(time!==null && time>Date.parse(commitAt)+60000)throw Error('future_input');
  return time===null || time<=end;
 })]));
 const at=new Date(graceAt(date));
 const dataset:Dataset={kind:'github_snapshot',source:'https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/reward-snapshots.json',revision:'sha256:'+sha(snapshot),dataFetchedAt:at.toISOString(),sourceStatus:'available',cacheSeconds:300,continuouslyUpdated:false};
 const audit:Audit={version:1,checkedAt:at.toISOString(),state:'unavailable',reason:'api_unavailable',workflowState:'unknown',scheduledRunCount:null,runs:[],latestDatasetCommit:null};
 const health=summarizeHealth(scoped,tokens,dataset,audit,null,'dated_investigation',at);
 const brief=buildBrief(scoped,tokens,dataset,health,date,at);
 return {tokens,brief,rows:brief.rows.map(row=>{const {evidence,...fact}=row;void evidence;return fact;})};
}
export function createEdition(input:{date:string;snapshot:Buffer;allowlist:Buffer;commit:string;committedAt:string;correction?:EditionBody['correction']},now=new Date()):Edition {
 const {date,snapshot,allowlist,commit,committedAt}=input;
 if(!validBriefDate(date,now)||now.getTime()<graceAt(date))throw Error('grace_pending');
 if(now.getTime()-graceAt(date)>8*86400000)throw Error('retention_boundary');
 if(!/^[a-f0-9]{40}$/.test(commit)||parseHistoryTimestamp(committedAt)===null||Date.parse(committedAt)>now.getTime()+60000)throw Error('unverified_commit');
 if(snapshot.length>2*1024*1024||allowlist.length>65536)throw Error('oversized_evidence');
 const correction=input.correction??null;
 if(correction && (!hex(correction.parent)||typeof correction.notice!=='string'||correction.notice.trim().length<10||correction.notice.length>500||/[\x00-\x1f]/.test(correction.notice)))throw Error('invalid_correction');
 const result=facts(snapshot,allowlist,date,committedAt);
 const limitations=['Captured API reports, not independently reconciled transfers.','No fabricated observations, interpolation or cross-quote sums.','Incomplete coverage withholds figures; no finding does not mean zero payouts.','Historical identity configuration and full input bytes are preserved.'];
 const body:EditionBody={schema:1,date,method:ARCHIVE_METHOD,calculationMethod:BRIEF_METHOD,eligibleAt:new Date(graceAt(date)).toISOString(),inputCommit:commit,inputCommittedAt:committedAt,
  source:'https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/'+commit+'/data/reward-snapshots.json',
  snapshotRevision:'sha256:'+sha(snapshot),allowlistRevision:'sha256:'+sha(allowlist),snapshotBase64:snapshot.toString('base64'),allowlistBase64:allowlist.toString('base64'),correction,
  headline:result.brief.headline,findingCount:result.brief.findingCount,verifiedCount:result.brief.verifiedCount,rows:result.rows,limitations};
 const edition={id:sha(canonical(body)),body};if(Buffer.byteLength(JSON.stringify(edition))>MAX_ARCHIVE_BYTES)throw Error('oversized_edition');return edition;
}
export function validateEdition(value:unknown):Edition {
 if(!object(value)||!hex(value.id)||!object(value.body)||Object.keys(value).some(k=>k!=='id'&&k!=='body')||sha(canonical(value.body))!==value.id)throw Error('invalid_edition_hash');
 const b=value.body as unknown as EditionBody;
 if(graceAt(b.date)>Date.now()||Date.parse(b.inputCommittedAt)>Date.now()+60000)throw Error('not_finalizable');
 if(b.schema!==1||b.method!==ARCHIVE_METHOD||b.calculationMethod!==BRIEF_METHOD)throw Error('unsupported_method');
 const snapshot=decode(b.snapshotBase64,2*1024*1024),allowlist=decode(b.allowlistBase64,65536);
 if(b.snapshotRevision!=='sha256:'+sha(snapshot)||b.allowlistRevision!=='sha256:'+sha(allowlist))throw Error('evidence_hash_mismatch');
 const rebuilt=createEdition({date:b.date,snapshot,allowlist,commit:b.inputCommit,committedAt:b.inputCommittedAt,correction:b.correction},new Date(Math.max(graceAt(b.date),Date.parse(b.inputCommittedAt))));
 if(canonical(rebuilt)!==canonical(value))throw Error('nonreproducible_edition');return rebuilt;
}
export function appendEdition(index:ArchiveIndex,edition:Edition):{index:ArchiveIndex;state:'created'|'duplicate'} {
 validateIndex(index);validateEdition(edition);const {date,correction}=edition.body,existing=index.dates[date];
 if(existing && [existing.original,...existing.corrections].includes(edition.id))return {index,state:'duplicate'};
 if(!correction && existing)throw Error('conflicting_original');
 if(correction && (!existing||![existing.original,...existing.corrections].includes(correction.parent)))throw Error('missing_parent');
 if(existing && existing.corrections.length>=MAX_EDITIONS-1)throw Error('edition_capacity');
 if(!existing && Object.keys(index.dates).length>=MAX_ARCHIVE_DATES)throw Error('archive_capacity');
 const updated=structuredClone(index);
 updated.dates[date]=existing?{original:existing.original,corrections:[...existing.corrections,edition.id]}:{original:edition.id,corrections:[]};
 return {index:updated,state:'created'};
}
export function archiveReport(edition:Edition,index:ArchiveIndex):BriefReport {
 const b=edition.body,tokens:TrackedToken[]=validateTrackedTokens(JSON.parse(Buffer.from(b.allowlistBase64,'base64').toString('utf8')));
 const path='/brief/'+b.date+'/editions/'+edition.id;
 const dataset:Dataset={kind:'github_snapshot',source:b.source,revision:b.snapshotRevision,dataFetchedAt:null,sourceStatus:'available',cacheSeconds:300,continuouslyUpdated:false};
 return {date:b.date,method:BRIEF_METHOD,provisional:false,dayClosed:true,evaluatedAt:b.eligibleAt,dataset,headline:b.headline,findingCount:b.findingCount,verifiedCount:b.verifiedCount,version:edition.id,canonicalPath:path,sharePath:path,
  rows:b.rows.map(row=>({...row,evidence:{brief:'/api/archive?date='+b.date+'&id='+edition.id,history:'/api/history?mint='+row.mint,dossier:'/?mint='+row.mint,official:tokens.find(t=>t.mint===row.mint)!.source,identity:b.source.replace('data/reward-snapshots.json','data/tracked-mints.json')}})),
  publication:{state:'finalized',id:edition.id,eligibleAt:b.eligibleAt,inputCommit:b.inputCommit,inputCommittedAt:b.inputCommittedAt,method:b.method,correction:b.correction,related:index.dates[b.date]?.corrections??[],evidence:'/api/archive?date='+b.date+'&id='+edition.id},
 };
}
