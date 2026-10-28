/** Private journal FORMAT rehearsal only: no persistence, encryption, export or auth. */
import {parsePacket} from '../trader-pulse/validation';
import type {Asset} from './contract';
import {asset,canonical,deepFreeze,hash,time} from './internal';
export type ThesisContent = Readonly<{thesis:string;invalidation:string|null;contradictions:string|null}>;
export type ThesisChange =
  | Readonly<{kind:'created'|'revised';content:ThesisContent;fact_snapshot_refs:readonly string[]}>
  | Readonly<{kind:'updated';content:Readonly<{note:string}>;fact_snapshot_refs:readonly string[]}>
  | Readonly<{kind:'redaction_requested';content:Readonly<{targets:readonly string[];reason:string}>;fact_snapshot_refs:readonly string[]}>
  | Readonly<{kind:'deletion_requested';content:Readonly<{reason:string}>;fact_snapshot_refs:readonly string[]}>;
export type ThesisEvent = Readonly<{
  version:'unfarmd-thesis/1';ownerScope:string;journalId:string;asset:Asset;sequence:number;
  created_at:string;recorded_at:string;previousHash:string|null;supersedes:string|null;
  change:ThesisChange;hash:string;
}>;
export type JournalAnchor=Readonly<{length:number;head:string}>;
export type JournalScope=Readonly<{ownerScope:string;journalId:string;asset:Asset}>;
export const THESIS_POLICY=Object.freeze({storage:false,encrypted:false,export:false,authenticated:false,
  maxEvents:64,maxBytes:131072,maxSnapshotRefs:8} as const);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH=/^[a-f0-9]{64}$/;
const SNAPSHOT=/^unfarmd-intelligence\/1:sha256:[a-f0-9]{64}$/;
const reject=():never=>{throw Error('thesis_journal_rejected');};
function object(v:unknown,keys:readonly string[]):Record<string,unknown> {
  if (!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join('|')!==[...keys].sort().join('|'))return reject();
  const out:Record<string,unknown>={};
  for(const k of keys){const d=Object.getOwnPropertyDescriptor(v,k);if(!d||!('value'in d))return reject();out[k]=d.value;}
  return out;
}
function text(v:unknown,max:number):string {
  if(typeof v!=='string'||v.trim().length===0||v.length>max||Buffer.byteLength(v)>max*4||/[\p{Cf}\x00-\x08\x0b-\x1f\x7f]/u.test(v))return reject();
  return v; // Preserve original text exactly; render only as text, never HTML.
}
function clock(v:unknown):number {
  if(typeof v!=='string')return reject();const ms=Date.parse(v);
  try{if(time(ms)!==v)return reject();}catch{return reject();}return ms;
}
function refs(v:unknown,pattern:RegExp,max:number):readonly string[] {
  if(!Array.isArray(v)||v.length>max||v.some(s=>typeof s!=='string'||!pattern.test(s))||new Set(v).size!==v.length)return reject();
  return [...v];
}
function scope(v:unknown):JournalScope {
  const r=object(v,['ownerScope','journalId','asset']),a=object(r.asset,['chain','mint']);
  if(typeof r.ownerScope!=='string'||!UUID.test(r.ownerScope)||typeof r.journalId!=='string'||!UUID.test(r.journalId)||a.chain!=='solana')return reject();
  try{return {ownerScope:r.ownerScope,journalId:r.journalId,asset:asset(a.mint)};}catch{return reject();}
}
function change(v:unknown):ThesisChange {
  const r=object(v,['kind','content','fact_snapshot_refs']),links=refs(r.fact_snapshot_refs,SNAPSHOT,THESIS_POLICY.maxSnapshotRefs);
  if(r.kind==='created'||r.kind==='revised'){
    const c=object(r.content,['thesis','invalidation','contradictions']);
    return {kind:r.kind,content:{thesis:text(c.thesis,2000),invalidation:c.invalidation===null?null:text(c.invalidation,1000),contradictions:c.contradictions===null?null:text(c.contradictions,1000)},fact_snapshot_refs:links};
  }
  if(r.kind==='updated'){const c=object(r.content,['note']);return {kind:r.kind,content:{note:text(c.note,2000)},fact_snapshot_refs:links};}
  if(links.length)return reject();
  if(r.kind==='redaction_requested'){
    const c=object(r.content,['targets','reason']),targets=refs(c.targets,HASH,16);if(!targets.length)return reject();
    return {kind:r.kind,content:{targets,reason:text(c.reason,500)},fact_snapshot_refs:[]};
  }
  if(r.kind==='deletion_requested'){const c=object(r.content,['reason']);return {kind:r.kind,content:{reason:text(c.reason,500)},fact_snapshot_refs:[]};}
  return reject();
}
function event(v:unknown):ThesisEvent {
  const r=object(v,['version','ownerScope','journalId','asset','sequence','created_at','recorded_at','previousHash','supersedes','change','hash']);
  const s=scope({ownerScope:r.ownerScope,journalId:r.journalId,asset:r.asset});
  if(r.version!=='unfarmd-thesis/1'||!Number.isSafeInteger(r.sequence)||(r.sequence as number)<1||
    typeof r.hash!=='string'||!HASH.test(r.hash)||
    (r.previousHash!==null&&(typeof r.previousHash!=='string'||!HASH.test(r.previousHash)))||
    (r.supersedes!==null&&(typeof r.supersedes!=='string'||!HASH.test(r.supersedes))))return reject();
  clock(r.created_at);clock(r.recorded_at);
  return {version:'unfarmd-thesis/1',...s,sequence:r.sequence as number,created_at:r.created_at as string,recorded_at:r.recorded_at as string,
    previousHash:r.previousHash as string|null,supersedes:r.supersedes as string|null,change:change(r.change),hash:r.hash};
}
/** Self-consistent hashes are NOT authorship/authentication. Rollback detection
 * requires an independently retained trusted prefix; none is stored here. */
export function replayThesis(input:unknown,expectedScope:JournalScope,nowMs:number,anchor?:JournalAnchor){
  try{
    const expected=scope(expectedScope);time(nowMs);
    if(!Array.isArray(input)||input.length>THESIS_POLICY.maxEvents)return reject();
    const entries=input.map(event);
    if(Buffer.byteLength(canonical(entries))>THESIS_POLICY.maxBytes)return reject();
    let previous:ThesisEvent|null=null,latestThesis:ThesisEvent|null=null,deletionRequested=false;
    const seen=new Map<string,ThesisEvent>(),privacyRequests:string[]=[];
    for(const e of entries){
      if(canonical(scope({ownerScope:e.ownerScope,journalId:e.journalId,asset:e.asset}))!==canonical(expected))return reject();
      const {hash:claimed,...body}=e;if(hash(body)!==claimed||seen.has(claimed))return reject();
      if(e.sequence!==(previous?.sequence??0)+1||e.previousHash!==(previous?.hash??null)||
        clock(e.created_at)!==clock(previous?.created_at??e.created_at)||clock(e.created_at)>clock(e.recorded_at)||
        clock(e.recorded_at)>nowMs||(previous&&clock(e.recorded_at)<clock(previous.recorded_at)))return reject();
      const c=e.change;
      if(!previous&&(c.kind!=='created'||e.supersedes!==null||e.created_at!==e.recorded_at))return reject();
      if(previous&&c.kind==='created')return reject();
      if(deletionRequested)return reject(); // terminal request; no silent resurrection
      if(c.kind==='created'||c.kind==='revised'){
        if(e.supersedes!==(latestThesis?.hash??null))return reject();latestThesis=e;
      }else if(e.supersedes!==null)return reject();
      if(c.kind==='redaction_requested'){
        for(const target of c.content.targets){const t=seen.get(target);if(!t||!['created','revised','updated'].includes(t.change.kind))return reject();}
        privacyRequests.push(e.hash);
      }
      if(c.kind==='deletion_requested'){deletionRequested=true;privacyRequests.push(e.hash);}
      previous=e;seen.set(e.hash,e);
    }
    if(anchor){
      const a=object(anchor,['length','head']);
      if(!Number.isSafeInteger(a.length)||(a.length as number)<1||(a.length as number)>entries.length||typeof a.head!=='string'||!HASH.test(a.head)||entries[(a.length as number)-1].hash!==a.head)return reject();
    }
    return deepFreeze({version:'unfarmd-thesis-replay/1' as const,entries,head:previous?.hash??null,length:entries.length,
      integrity:anchor?'matches_external_trusted_prefix' as const:'self_consistent_only' as const,
      authorship:'owner_claim_unverified' as const,privacyRequests,deletionRequested,
      privacyExecution:'not_performed' as const,persistence:'not_implemented' as const,
      factReferences:'references_only_not_verified_evidence' as const});
  }catch{return reject();}
}
/** Compare-and-append MODEL only; actual cross-device CAS requires reviewed storage. */
export function appendThesis(entries:readonly ThesisEvent[],input:{scope:JournalScope;change:ThesisChange;recorded_at:string},expectedHead:string|null,nowMs:number):readonly ThesisEvent[]{
  try{
    const i=object(input,['scope','change','recorded_at']),s=scope(i.scope),c=change(i.change),replay=replayThesis(entries,s,nowMs);
    if(replay.head!==expectedHead||replay.deletionRequested)return reject();
    clock(i.recorded_at);const latest=[...replay.entries].reverse().find(e=>['created','revised'].includes(e.change.kind));
    const body={version:'unfarmd-thesis/1' as const,...s,sequence:replay.length+1,created_at:replay.entries[0]?.created_at??i.recorded_at as string,
      recorded_at:i.recorded_at as string,previousHash:replay.head,supersedes:c.kind==='revised'?latest?.hash??null:null,change:c};
    const next=[...replay.entries,{...body,hash:hash(body)}];return replayThesis(next,s,nowMs).entries;
  }catch{return reject();}
}
/** Offline bounded wire validator, not an import/export or saved-journal feature. */
export function validateThesisPacket(text:string,expectedScope:JournalScope,nowMs:number,anchor?:JournalAnchor){
  try{if(typeof text!=='string'||Buffer.byteLength(text)>THESIS_POLICY.maxBytes)return reject();return replayThesis(parsePacket(text),expectedScope,nowMs,anchor);}catch{return reject();}
}
