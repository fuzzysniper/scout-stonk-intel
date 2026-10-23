import contract from './contract.json';
import {base58,bytes58,pda} from './identity';
export const PROGRAM=contract.program;
export const ZERO='11111111111111111111111111111111';
export const WSOL='So11111111111111111111111111111111111111112';
export const USDC='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const TOKEN='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const TOKEN2022='TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
export const curve=(mint:string)=>pda([Buffer.from('bonding-curve'),bytes58(mint,32)],PROGRAM);
export const eventAuthority=pda([Buffer.from('__event_authority')],PROGRAM);
export const EVENT_CPI=Buffer.from('e445a52e51cb9a1d','hex');
type WireType=string|{vec:{defined:{name:string}}};
type Field={name:string;type:WireType};
export type Event={kind:string;fields:Record<string,unknown>;instruction:number;position:number};
export function record(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('invalid_object');return v as Record<string,unknown>;}
export function array(v:unknown):unknown[]{if(!Array.isArray(v)||v.length>2048)throw Error('invalid_array');return v;}
export function integer(v:unknown):number{if(typeof v!=='number'||!Number.isSafeInteger(v)||v<0)throw Error('invalid_integer');return v;}
export function decodeEvent(b:Buffer):Omit<Event,'instruction'|'position'> {
 if(b.length>8192||b.length<8)throw Error('event_size');let pos=8;
 const kind=Object.entries(contract.events).find(([,d])=>b.subarray(0,8).equals(Buffer.from(d)))?.[0];if(!kind)throw Error('unsupported_event');
 function take(n:number){if(pos+n>b.length)throw Error('truncated_event');const r=b.subarray(pos,pos+n);pos+=n;return r;}
 function read(t:WireType):unknown {
  if(t==='pubkey')return base58(take(32));
  if(t==='bool'){const v=take(1)[0];if(v>1)throw Error('invalid_bool');return v===1;}
  if(t==='u8')return take(1)[0];
  if(t==='u16')return take(2).readUInt16LE();
  if(t==='u64')return take(8).readBigUInt64LE().toString();
  if(t==='i64')return take(8).readBigInt64LE().toString();
  if(t==='string'){const n=take(4).readUInt32LE();if(n>1024)throw Error('string_bound');return new TextDecoder('utf-8',{fatal:true}).decode(take(n));}
  if(typeof t==='object'){const n=take(4).readUInt32LE();if(n>32)throw Error('vector_bound');return Array.from({length:n},()=>fields(t.vec.defined.name));}
  throw Error('unsupported_type');
 }
 function fields(name:string):Record<string,unknown>{const fs=(contract.types as Record<string,Field[]>)[name];if(!fs)throw Error('unsupported_type');return Object.fromEntries(fs.map(f=>[f.name,read(f.type)]));}
 const f=fields(kind);if(pos!==b.length)throw Error('unrecognized_event_revision');return {kind,fields:f};
}

/** Strict subset of getTransaction encoding=json. No provider feed aliases or JSON-parsed instructions. */
export function transactionEvents(value:unknown,signature:string):{slot:number;blockTime:number|null;events:Event[]} {
 const tx=record(value),tr=record(tx.transaction),meta=record(tx.meta),message=record(tr.message);
 if(meta.err!==null)throw Error('failed_transaction');
 const signatures=array(tr.signatures);if(signatures[0]!==signature)throw Error('signature_mismatch');for(const s of signatures)bytes58(s,64);
 const keys=array(message.accountKeys).map(k=>{bytes58(k,32);return k as string;});
 if(meta.loadedAddresses!==undefined){const l=record(meta.loadedAddresses);for(const a of [...array(l.writable),...array(l.readonly)]){bytes58(a,32);keys.push(a as string);}}
 const at=(n:unknown)=>{const k=keys[integer(n)];if(!k)throw Error('account_index');return k;};
 const instructions=array(message.instructions),groups=array(meta.innerInstructions),events:Event[]=[];
 const groupIndices=new Set<number>();
 for(const raw of groups){const g=record(raw),index=integer(g.index);if(index>=instructions.length||groupIndices.has(index))throw Error('inner_group');groupIndices.add(index);array(g.instructions);}
 for(let index=0;index<instructions.length;index++){
  const ix=record(instructions[index]);if(at(ix.programIdIndex)!==PROGRAM)continue;
  const data=bytes58(ix.data),entry=Object.entries(contract.instructions).find(([,s])=>data.subarray(0,8).equals(Buffer.from(s.discriminator)));
  if(!entry)throw Error('unsupported_pump_instruction');
  const [name,spec]=entry,accounts=array(ix.accounts).map(at);
  if(accounts.length<spec.accounts.length)throw Error('missing_accounts');
  const account=(n:string)=>accounts[spec.accounts.indexOf(n)];
  const mint=account('base_mint')??account('mint');bytes58(mint,32);
  if(account('bonding_curve')!==curve(mint)||account('program')!==PROGRAM||account('event_authority')!==eventAuthority)throw Error('instruction_identity');
  const tokenProgram=account('base_token_program')??account('token_program');
  if(![TOKEN,TOKEN2022].includes(tokenProgram))throw Error('token_program');
  if((name==='create_v2'&&tokenProgram!==TOKEN2022)||(name==='create'&&tokenProgram!==TOKEN))throw Error('creation_program');
  const group=groups.map(record).find(g=>g.index===index);
  if(!group)throw Error('event_cpi_missing');
  const found:Event[]=[];
  for(const [position,raw] of array(group.instructions).entries()){
   const inner=record(raw);if(at(inner.programIdIndex)!==PROGRAM)continue;
   const payload=bytes58(inner.data);
   if(!payload.subarray(0,8).equals(EVENT_CPI))throw Error('nested_pump_call_unsupported');
   // Only direct event CPI from a top-level Pump instruction. Nested/router calls fail closed.
   if(inner.stackHeight!==2||array(inner.accounts).map(at).join(',')!==eventAuthority)throw Error('event_authority');
   const e=decodeEvent(payload.subarray(8)),f=e.fields;
   if(f.mint!==mint||(f.bonding_curve!==undefined&&f.bonding_curve!==curve(mint)))throw Error('event_identity');
   if(e.kind==='CreateEvent'){
    if(!['create','create_v2'].includes(name)||f.token_program!==tokenProgram)throw Error('event_instruction');
    const remaining=accounts.slice(spec.accounts.length),q=remaining[0];
    const expected=(!q||q===WSOL)?ZERO:q;
    if((name==='create'&&remaining.length!==0)||(q&&remaining.length<3)||f.quote_mint!==expected)throw Error('creation_quote');
   } else if(e.kind==='TradeEvent'){
    // ix_name is retained in the hashed event, but no undocumented v3 naming convention is assumed.
    if(!['buy','sell','buy_exact_sol_in','buy_v2','sell_v2','buy_exact_quote_in_v2','buy_v3','sell_v3','buy_exact_quote_in_v3'].includes(name)||f.is_buy!==(name!=='sell'&&!name.startsWith('sell_')))throw Error('trade_instruction');
    const q=account('quote_mint');if((f.quote_mint===ZERO?(q!==undefined&&q!==WSOL):q!==f.quote_mint))throw Error('trade_quote');
   } else if(e.kind==='CompletePumpAmmMigrationEvent'&&name!=='migrate')throw Error('migration_instruction');
   found.push({...e,instruction:index,position});
  }
  if(!found.length||(['create','create_v2'].includes(name)&&found.filter(e=>e.kind==='CreateEvent').length!==1))throw Error('creation_event_missing');
  events.push(...found);
 }
 if(!events.length)throw Error('no_supported_pump_event');
 return {slot:integer(tx.slot),blockTime:tx.blockTime===null?null:integer(tx.blockTime),events};
}
