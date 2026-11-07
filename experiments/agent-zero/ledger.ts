import {mkdirSync,openSync,readFileSync,writeSync,closeSync,fsyncSync,existsSync,unlinkSync,statSync,lstatSync,realpathSync,constants} from 'node:fs';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {canonical,claimedHoldings,digest,keys,latestPolicy,micros,mint,object,observations,qualify,sha,signature,text,time,uint,integer,validateObservation,validatePolicy,VERSION,type Claim,type Decision,type Entry,type Mode} from './core';
import {observationKey} from './sources';
import {validatePlan,validatePoint,type ShadowPlan} from './evaluation';
export function checkData(kind:Entry['kind'],raw:unknown,rows:Entry[],at:string,mode:Mode):unknown{
 if(kind==='policy')return validatePolicy(raw);
 if(kind==='observation'){const o=validateObservation(raw,mode);if(micros(o.observedAt)>micros(at))throw Error('future_evidence');if(observations(rows).some(x=>observationKey(x.observation)===observationKey(o)))throw Error('duplicate_evidence');return o;}
 if(kind==='decision'){
  const d=object(raw);keys(d,['mint','action','evidenceHashes','policyHash','criteriaVersion','criteriaSnapshot','hypothesis','disqualifiers','missingEvidence','entryConditions','invalidation','exitConsiderations']);
  const m=mint(d.mint),known=observations(rows,m);if(!known.length)throw Error('no_discovery');if(!Array.isArray(d.evidenceHashes)||canonical(d.evidenceHashes)!==canonical(known.map(x=>x.entry.hash)))throw Error('all_asof_evidence_required');if(d.policyHash!==latestPolicy(rows).entry.hash)throw Error('current_policy_required');if(!['wait','reject','shadow','review'].includes(String(d.action)))throw Error('invalid_decision');if(d.action==='review'&&qualify(mode,known.map(x=>x.observation)).state!=='ELIGIBLE FOR FOUNDER REVIEW')throw Error('review_gate_closed');
  if(d.criteriaVersion!=='agent0-qualification/1'||canonical(d.criteriaSnapshot)!==canonical(qualify(mode,known.map(x=>x.observation))))throw Error('original_criteria_snapshot_required');
  return {mint:m,action:d.action,criteriaVersion:d.criteriaVersion,criteriaSnapshot:d.criteriaSnapshot,evidenceHashes:d.evidenceHashes,policyHash:d.policyHash,...Object.fromEntries(['hypothesis','disqualifiers','missingEvidence','entryConditions','invalidation','exitConsiderations'].map(k=>[k,text(d[k])]))} as Decision;
 }
 if(kind==='claim'){
  if(mode!=='recorded')throw Error('shadow_real_separation');const c=object(raw);keys(c,['walletLabel','signature','mint','raw','decimals','direction','transactionAt','note']);const walletLabel=text(c.walletLabel,40);if(!/^[A-Za-z0-9 _.-]+$/.test(walletLabel))throw Error('wallet_label_only');const sig=signature(c.signature),m=mint(c.mint),amount=uint(c.raw);if(BigInt(amount)===0n)throw Error('positive_quantity_required');if(!['in','out'].includes(String(c.direction)))throw Error('invalid_direction');const transactionAt=time(c.transactionAt);if(micros(transactionAt)>micros(at))throw Error('future_transaction');if(rows.some(e=>e.kind==='claim'&&(e.data as Claim).signature===sig&&(e.data as Claim).mint===m))throw Error('duplicate_signature_asset');if(rows.some(e=>e.kind==='claim'&&(e.data as Claim).mint===m&&(e.data as Claim).decimals!==c.decimals))throw Error('conflicting_decimals');const claim={walletLabel,signature:sig,mint:m,raw:amount,decimals:integer(c.decimals,0,255),direction:c.direction as Claim['direction'],transactionAt,note:text(c.note)};claimedHoldings([...rows,{kind:'claim',data:claim} as Entry]);return claim;
 }
 if(kind==='shadow_plan'){
  const p=validatePlan(raw),d=rows.find(e=>e.hash===p.decisionHash&&e.kind==='decision');if(!d||(d.data as Decision).mint!==p.mint||(d.data as Decision).action!=='shadow')throw Error('shadow_decision_required');if(!observations(rows,p.mint).some(x=>(d.data as Decision).evidenceHashes.includes(x.entry.hash)&&x.observation.pool===p.pool&&x.observation.quoteMint===p.quoteMint))throw Error('decision_pair_identity_required');if(rows.some(e=>e.kind==='shadow_plan'&&(e.data as ShadowPlan).decisionHash===p.decisionHash))throw Error('one_plan_per_decision');return p;
 }
 if(kind==='outcome'){
  if(mode!=='synthetic')throw Error('no_approved_market_adapter');const o=object(raw);keys(o,['planHash','point']);const planHash=digest(o.planHash),p=rows.find(e=>e.hash===planHash&&e.kind==='shadow_plan');if(!p)throw Error('plan_required_before_outcome');const point=validatePoint(o.point),plan=p.data as ShadowPlan;if(point.mint!==plan.mint||point.pool!==plan.pool||point.quoteMint!==plan.quoteMint||point.quoteDecimals!==plan.quoteDecimals)throw Error('outcome_identity_mismatch');if(micros(point.availableAt)>micros(at)||micros(point.observedAt)<=micros(p.at))throw Error('outcome_causality');if(rows.some(e=>e.kind==='outcome'&&canonical(e.data)===canonical({planHash,point})))throw Error('duplicate_outcome');return {planHash,point};
 }
 throw Error('unsupported_event');
}
export function verify(lines:string,mode:Mode):Entry[]{
 if(!lines)return [];if(!lines.endsWith('\n'))throw Error('torn_tail_recovery_required');if(Buffer.byteLength(lines)>32*1024*1024)throw Error('ledger_size_limit');const rows:Entry[]=[],ids=new Set<string>();
 for(const line of lines.slice(0,-1).split('\n')){const e=object(JSON.parse(line));keys(e,['version','seq','mode','at','requestId','requestDigest','previous','kind','data','hash']);if(canonical(e)!==line)throw Error('noncanonical_ledger');if(e.version!==VERSION||e.mode!==mode||e.seq!==rows.length||e.previous!==(rows.at(-1)?.hash??'0'.repeat(64)))throw Error('chain_or_mode_mismatch');const at=time(e.at);if(rows.length&&micros(at)<micros(rows.at(-1)!.at))throw Error('backward_clock');const id=text(e.requestId,100);if(ids.has(id))throw Error('duplicate_request_id');ids.add(id);digest(e.requestDigest);const {hash,...body}=e;if(digest(hash)!==sha(canonical(body)))throw Error('hash_mismatch');const data=checkData(e.kind as Entry['kind'],e.data,rows,at,mode);if(canonical(data)!==canonical(e.data))throw Error('noncanonical_event');rows.push(e as unknown as Entry);if(rows.length>10000)throw Error('ledger_event_limit');}
 if(rows.length&&rows[0].kind!=='policy')throw Error('genesis_policy_required');return rows;
}
export type StoredEntry=Entry&{requestDigest:string};
export class Store{
 readonly path:string;private lock:string;
 constructor(readonly directory:string,readonly mode:Mode,repositoryRoot:string){
  if(!isAbsolute(directory))throw Error('absolute_private_directory_required');const rel=relative(resolve(repositoryRoot),resolve(directory));if(!rel||(!rel.startsWith('..')&&!isAbsolute(rel)))throw Error('ledger_must_be_outside_checkout');
  mkdirSync(directory,{recursive:true,mode:0o700});const physical=relative(realpathSync(repositoryRoot),realpathSync(directory));if(!physical||(!physical.startsWith('..')&&!isAbsolute(physical)))throw Error('ledger_must_be_outside_checkout');this.path=join(directory,mode+'.jsonl');this.lock=this.path+'.lock';
 }
 read():StoredEntry[]{if(!existsSync(this.path))return [];if(lstatSync(this.path).isSymbolicLink())throw Error('symlink_ledger_forbidden');if(statSync(this.path).size>32*1024*1024)throw Error('ledger_size_limit');return verify(readFileSync(this.path,'utf8'),this.mode) as StoredEntry[];}
 append(requestId:string,command:unknown,kind:Entry['kind'],at:string,build:(rows:Entry[])=>unknown):{entry:StoredEntry;duplicate:boolean}{
  text(requestId,100);time(at);const requestDigest=sha(canonical(command));let lockFd:number|undefined;
  try{
   lockFd=openSync(this.lock,'wx',0o600);const rows=this.read();const existing=rows.find(e=>e.requestId===requestId);if(existing){if(existing.requestDigest!==requestDigest)throw Error('idempotency_conflict');return {entry:existing,duplicate:true};}
   if(rows.length>=10000||rows.length&&micros(at)<micros(rows.at(-1)!.at))throw Error('clock_or_size_limit');if(!rows.length&&kind!=='policy')throw Error('genesis_policy_required');const data=checkData(kind,build(rows),rows,at,this.mode);const body={version:VERSION,seq:rows.length,mode:this.mode,at,requestId,requestDigest,previous:rows.at(-1)?.hash??'0'.repeat(64),kind,data};const entry:StoredEntry={...body,version:VERSION,hash:sha(canonical(body))};if((existsSync(this.path)?statSync(this.path).size:0)+Buffer.byteLength(canonical(entry)+'\n')>32*1024*1024)throw Error('ledger_size_limit');const fd=openSync(this.path,constants.O_WRONLY|constants.O_APPEND|constants.O_CREAT|(constants.O_NOFOLLOW??0),0o600);
   try{const bytes=Buffer.from(canonical(entry)+'\n');let offset=0;while(offset<bytes.length){const written=writeSync(fd,bytes,offset,bytes.length-offset);if(written<=0)throw Error('short_write');offset+=written;}fsyncSync(fd);}finally{closeSync(fd);}return {entry,duplicate:false};
  }finally{if(lockFd!==undefined){closeSync(lockFd);unlinkSync(this.lock);}}
 }
}
