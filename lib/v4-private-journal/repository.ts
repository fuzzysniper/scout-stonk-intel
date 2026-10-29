import 'server-only';
import type {Pool,PoolClient} from 'pg';
import {appendThesis,replayThesis,type ThesisEvent,type JournalAnchor} from '../unfarmd-intelligence/thesis';
import {canonical,deepFreeze} from '../unfarmd-intelligence/internal';
import {JournalError,type AppendCommand,type AppendResult,type JournalRead,type JournalReceipt} from './contract';
import {type OwnerAuthority,type VerifiedOwner} from './auth';
import {open,seal,storageHash,type OwnerKeys,type Context} from './crypto';
import {fields,identity,uuid,hex,fail} from './validation';
type Row={owner_id:string;journal_id:string;sequence:number;request_id:string;previous_head:string|null;head:string;payload:string};
type Meta={mint:string;revision:number;head:string|null;revoked_at:Date|null;expires_at:Date};
const context=(r:Row,mint:string):Context=>({ownerId:r.owner_id,journalId:r.journal_id,mint,sequence:r.sequence,previousHead:r.previous_head,requestId:r.request_id});
const error=(e:unknown)=>{
 if(e instanceof JournalError)return e;
 const p=e as {code?:string;message?:string};
 if(p?.message==='journal_conflict'||p?.code==='23505')return new JournalError('conflict');
 if(p?.message==='journal_limit')return new JournalError('limit');
 if(p?.message==='journal_unavailable')return new JournalError('not_available');
 return new JournalError('unavailable');
};
function command(input:unknown):AppendCommand{
 const c=fields(input,['journalId','mint','requestId','expectedHead','change']);identity(c.journalId,c.mint);
 if(!uuid(c.requestId)||(c.expectedHead!==null&&!hex(c.expectedHead)))return fail('invalid_request');
 return c as AppendCommand;
}
/** Executable repository only; no default pool, credentials, env, auth installation or route.
 * The server must supply a trusted native TLS pool and separately managed owner keys.
 * Production entry index.ts never imports/constructs this class. */
export class PostgresJournalRepository{
 constructor(private readonly pool:Pick<Pool,'connect'>,private readonly keys:OwnerKeys,private readonly authority:OwnerAuthority,private readonly clock:()=>number=Date.now){}
 private async tx<T>(principal:VerifiedOwner,write:boolean,fn:(c:PoolClient,owner:string)=>Promise<T>):Promise<T>{
  const owner=this.authority.ownerId(principal,this.clock());let c:PoolClient|undefined;let begun=false;
  try{
   c=await this.pool.connect();await c.query(write?'BEGIN':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');begun=true;
   await c.query("SELECT set_config('unfarmd.owner_id',$1,true),set_config('statement_timeout','1200',true),set_config('lock_timeout','1000',true),set_config('idle_in_transaction_session_timeout','3000',true)",[owner]);
   const result=await fn(c,owner);this.authority.ownerId(principal,this.clock()); // expiry while waiting for locks/keys cannot authorize a commit
   await c.query('COMMIT');begun=false;return deepFreeze(result);
  }catch(e){if(c&&begun){try{await c.query('ROLLBACK');}catch{/* Destroy uncertain connection; no retry or state reset. */}}throw error(e);
  }finally{c?.release(begun);}
 }
 private async load(c:PoolClient,owner:string,journalId:string,mint:string,meta:Meta,anchor?:JournalAnchor){
  const rows=(await c.query<Row>('SELECT * FROM unfarmd_journal.events WHERE owner_id=$1 AND journal_id=$2 ORDER BY sequence LIMIT 65',[owner,journalId])).rows;
  if(rows.length!==meta.revision||rows.length>64)return fail('integrity');
  const entries:ThesisEvent[]=[],requests:AppendCommand[]=[];let previous:string|null=null;
  for(let i=0;i<rows.length;i++){
   const r=rows[i];if(r.owner_id!==owner||r.journal_id!==journalId||r.sequence!==i+1||r.previous_head!==previous||storageHash(r.payload)!==r.head)return fail('integrity');
   const v=fields(await open(r.payload,context(r,mint),this.keys),['event','request']);
   entries.push(v.event as ThesisEvent);requests.push(command(v.request));previous=r.head;
  }
  if(previous!==meta.head)return fail('integrity');
  try{const replay=replayThesis(entries,{ownerScope:owner,journalId,asset:{chain:'solana',mint}},this.clock(),anchor);
   return {rows,entries:replay.entries,requests};
  }catch{return fail('integrity');}
 }
 private receipt(journalId:string,row:Row,event:ThesisEvent):JournalReceipt{
  return {journalId,revision:row.sequence,storageHead:row.head,eventHash:event.hash,recordedAt:event.recorded_at};
 }
 async append(principal:VerifiedOwner,input:unknown):Promise<AppendResult>{
  this.authority.ownerId(principal,this.clock());const cmd=command(input);
  return this.tx(principal,true,async(c,owner)=>{
   const meta=(await c.query<Meta>('SELECT * FROM unfarmd_journal.lock_journal($1,$2,$3)',[owner,cmd.journalId,cmd.mint])).rows[0];
   if(!meta)return fail('not_available');
   const prior=await this.load(c,owner,cmd.journalId,cmd.mint,meta);
   const duplicate=prior.rows.findIndex(r=>r.request_id===cmd.requestId);
   if(duplicate>=0){if(canonical(prior.requests[duplicate])!==canonical(cmd))return fail('conflict');
    return {state:'appended',replayed:true,receipt:this.receipt(cmd.journalId,prior.rows[duplicate],prior.entries[duplicate])};}
   if(meta.head!==cmd.expectedHead)return fail('conflict');
   const dbTime=Number((await c.query('SELECT floor(extract(epoch FROM clock_timestamp())*1000)::text AS ms')).rows[0].ms);
   if(Math.abs(dbTime-this.clock())>5000)return fail('unavailable');
   let entries:readonly ThesisEvent[];
   try{entries=appendThesis(prior.entries,{scope:{ownerScope:owner,journalId:cmd.journalId,asset:{chain:'solana',mint:cmd.mint}},change:cmd.change,recorded_at:new Date(dbTime).toISOString()},prior.entries.at(-1)?.hash??null,Math.max(dbTime,this.clock()));}
   catch{return fail('invalid_request');}
   const event=entries.at(-1)!,row:Row={owner_id:owner,journal_id:cmd.journalId,sequence:event.sequence,request_id:cmd.requestId,previous_head:meta.head,head:'',payload:''};
   row.payload=await seal({event,request:cmd},context(row,cmd.mint),this.keys);if(Buffer.byteLength(row.payload)>32768)return fail('limit');row.head=storageHash(row.payload);
   const revoke=cmd.change.kind==='deletion_requested'||cmd.change.kind==='redaction_requested';
   const head=(await c.query('SELECT unfarmd_journal.append_event($1,$2,$3,$4,$5,$6) AS head',[owner,cmd.journalId,cmd.expectedHead,cmd.requestId,row.payload,revoke])).rows[0].head;
   if(head!==row.head)return fail('integrity');
   return {state:revoke?'access_revoked_erasure_queued':'appended',replayed:false,receipt:this.receipt(cmd.journalId,row,event)};
  });
 }
 async read(principal:VerifiedOwner,journalId:string,mint:string,anchor?:JournalAnchor):Promise<JournalRead>{
  this.authority.ownerId(principal,this.clock());identity(journalId,mint);
  return this.tx(principal,false,async(c,owner)=>{
   const meta=(await c.query<Meta>('SELECT mint,revision,head,revoked_at,expires_at FROM unfarmd_journal.journals WHERE owner_id=$1 AND journal_id=$2 AND revoked_at IS NULL AND expires_at>clock_timestamp()',[owner,journalId])).rows[0];
   if(!meta||meta.mint!==mint||!meta.revision)return fail('not_available');
   const p=await this.load(c,owner,journalId,mint,meta,anchor);
   return {version:'unfarmd-private-journal/1',events:p.entries,receipt:this.receipt(journalId,p.rows.at(-1)!,p.entries.at(-1)!),authentication:'verified_owner_session',integrity:'database_chain_not_independent_backup_attestation',factReferences:'references_only_not_verified_evidence'};
  });
 }
 async list(principal:VerifiedOwner,limit=20):Promise<readonly {journalId:string;mint:string;revision:number}[]>{
  this.authority.ownerId(principal,this.clock());if(!Number.isInteger(limit)||limit<1||limit>20)return fail('invalid_request');
  return this.tx(principal,false,async(c,owner)=>(await c.query('SELECT journal_id AS "journalId",mint,revision FROM unfarmd_journal.journals WHERE owner_id=$1 AND revoked_at IS NULL AND expires_at>clock_timestamp() AND revision>0 ORDER BY created_at DESC,journal_id LIMIT $2',[owner,limit])).rows);
 }
}
