import 'server-only';
import {SOURCE_BODIES} from './sql-pins';
import {randomUUID} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import type {DynamicLedger,Command,Reply} from '../v4-ca-intelligence/admission';
import {verifiedPool} from '../v4-owner-ledger/postgres';
import {strictBindingEstablished} from '../../ops/v4-journal/native-tls.mjs';
import {SourcePolicyAuthority,type SourceApproval} from './source-policy';
export type SourceSnapshot=Readonly<{policyHash:string;releaseHash:string;ownerSubject:string;origin:string;runtimeKind:string;stopped:boolean;attempts:number;credits:number;lookups:number;leasePending:boolean}>;
/** Real same-infrastructure atomic ledger; no memory budget, retry, refund, restore or renew. */
export function createSourceLedger(config:Readonly<{authority:SourcePolicyAuthority;approval:SourceApproval;pool:Pool;tlsHost:string;role?:'unfarmd_v4_ca_login'|'unfarmd_v4_ca_stopper_login'}>){
 const initial=config.authority.inspect(config.approval,true);if(!initial)throw Error('source_not_admitted');
 const db=verifiedPool(config.pool,config.tlsHost),fence=randomUUID(),role=config.role??'unfarmd_v4_ca_login';let terminal=false,stop:Promise<Reply>|undefined;
 async function proof(c:PoolClient){
  if(!strictBindingEstablished(c))throw Error('source_native_binding_required');
  const p=await c.query("SELECT current_user=$1 AND session_user=current_user AND NOT has_database_privilege(current_user,current_database(),'CREATE,TEMP') AND NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname<>current_user AND pg_has_role(current_user,r.oid,'MEMBER')) AND EXISTS(SELECT 1 FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner WHERE p.oid='unfarmd_v4_ca_budget.step(jsonb,uuid,text)'::regprocedure AND p.prosecdef AND NOT p.proisstrict AND p.provolatile='v' AND p.proparallel='u' AND p.proconfig=ARRAY['search_path=pg_catalog'] AND r.rolname='unfarmd_v4_ca_owner' AND NOT(r.rolcanlogin OR r.rolsuper OR r.rolbypassrls) AND encode(sha256(convert_to(p.prosrc,'UTF8')),'hex')=$2 AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE')) AND NOT EXISTS(SELECT 1 FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='unfarmd_v4_ca_budget' AND (t.relpersistence<>'p' OR t.relrowsecurity)) AS ok",[role,SOURCE_BODIES['unfarmd_v4_ca_budget.step(jsonb,uuid,text)']]);
  if(p.rows[0]?.ok!==true)throw Error('source_ledger_proof_required');
  for(const [name,digest]of Object.entries(SOURCE_BODIES)){const row=(await c.query("SELECT p.proconfig=ARRAY['search_path=pg_catalog'] AND r.rolname='unfarmd_v4_ca_owner' AND NOT(r.rolcanlogin OR r.rolsuper OR r.rolbypassrls) AND encode(sha256(convert_to(p.prosrc,'UTF8')),'hex')=$2 AS ok FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner WHERE p.oid=$1::regprocedure",[name,digest])).rows[0];if(row?.ok!==true)throw Error('source_ledger_body_drift');}
 }
 async function tx(command:Command):Promise<Reply>{
  const binding=config.authority.inspect(config.approval,command.kind==='stop');if(!binding||command.policyHash!==binding.hash||role==='unfarmd_v4_ca_stopper_login'&&command.kind!=='stop')throw Error('source_not_admitted');
  const stable=JSON.parse(JSON.stringify(command)) as Command;if(Buffer.byteLength(JSON.stringify(stable))>2048)throw Error('source_command_limit');
  const c=await db.connect();let committed=false;try{
   await c.query('BEGIN');await c.query("SET LOCAL synchronous_commit=on; SET LOCAL statement_timeout='800ms'; SET LOCAL lock_timeout='100ms'; SET LOCAL search_path=pg_catalog");await proof(c);
   const result=await c.query('SELECT unfarmd_v4_ca_budget.step($1::jsonb,$2::uuid,$3::text) AS reply',[JSON.stringify(stable),fence,binding.hash]);
   if(result.rowCount!==1||!result.rows[0]?.reply)throw Error('source_ack_missing');await c.query('COMMIT');committed=true;return Object.freeze(result.rows[0].reply) as Reply;
  }finally{c.release(!committed);}
 }
 const ledger:DynamicLedger=Object.freeze({scope:'global_atomic_durable_ca_policy_v1',async transact(c:Command){if(c.kind==='stop'){terminal=true;stop??=tx(c);return stop;}if(terminal)return {kind:'denied',reason:'stopped'};try{const r=await tx(c);if(r.kind==='stopped'||r.kind==='denied'&&r.reason==='stopped')terminal=true;return r;}catch{terminal=true;throw Error('source_ledger_uncertain');}}});
 async function snapshot():Promise<SourceSnapshot|null>{try{const b=config.authority.inspect(config.approval);if(!b||terminal||role!=='unfarmd_v4_ca_login')return null;const c=await db.connect();try{await proof(c);const r=(await c.query('SELECT unfarmd_v4_ca_budget.inspect_policy($1) AS state',[b.hash])).rows[0]?.state as SourceSnapshot|null;return config.authority.inspect(config.approval)&&r&&r.policyHash===b.hash&&r.releaseHash===b.releaseHash&&r.ownerSubject===b.policy.ownerSubject&&r.origin===b.policy.origin&&r.runtimeKind===b.runtimeKind&&!r.stopped?r:null;}finally{c.release();}}catch{return null;}}
 return Object.freeze({ledger,snapshot});
}
