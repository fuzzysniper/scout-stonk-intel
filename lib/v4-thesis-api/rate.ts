import 'server-only';
import type {Pool,PoolClient} from 'pg';
import type {OwnerAuthority,VerifiedOwner} from '../v4-private-journal/auth';
export interface ThesisRatePort{reserve(principal:VerifiedOwner,operation:'read'|'write'):Promise<boolean>}
/** Trusted native TLS pool injection only. Durable reservation commits BEFORE a journal operation.
 * No refunds, fallback, retry or public counter-reset capability; ambiguous ACK fails closed. */
export class PostgresThesisRate implements ThesisRatePort{
 constructor(private readonly pool:Pick<Pool,'connect'>,private readonly authority:OwnerAuthority){}
 async reserve(principal:VerifiedOwner,op:'read'|'write'){
  const id=this.authority.ownerId(principal,Date.now());if(op!=='read'&&op!=='write')throw Error('rate_unavailable');
  let c:PoolClient|undefined,committed=false;
  try{c=await this.pool.connect();await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='1200ms'; SET LOCAL lock_timeout='1000ms'; SET LOCAL idle_in_transaction_session_timeout='3000ms'");
   const ok=(await c.query('SELECT unfarmd_thesis_rate.reserve($1,$2) AS ok',[id,op])).rows[0]?.ok;
   if(typeof ok!=='boolean')throw 0;await c.query('COMMIT');committed=true;return ok;
  }catch{if(c)try{await c.query('ROLLBACK');}catch{}throw Error('rate_unavailable');}finally{c?.release(!committed);}
 }
}
