/** Entirely invented identities, transactions and event values. No captured market response. */
import contract from './contract.json';
import {PROGRAM,ZERO,WSOL,TOKEN2022,TOKEN,curve,eventAuthority,EVENT_CPI} from './decode';
import {base58,bytes58} from './identity';
import type {Receipt} from './pipeline';
export const SYNTHETIC_MINT=base58(Buffer.alloc(32,7));
export const SYNTHETIC_OTHER_MINT=base58(Buffer.alloc(32,8));
export const AT='2026-10-22T12:00:10.000Z';
type Field={name:string;type:string|{vec:{defined:{name:string}}}};
export function syntheticEvent(kind:string,overrides:Record<string,unknown>={}):Buffer {
 function fields(n:string):Buffer{return Buffer.concat((contract.types as Record<string,Field[]>)[n].map(f=>encode(f.type,overrides[f.name]??defaults(f.name,f.type))));}
 function defaults(name:string,t:Field['type']):unknown {
  if(typeof t==='object')return [];
  if(t==='pubkey')return ({mint:SYNTHETIC_MINT,bonding_curve:curve(SYNTHETIC_MINT),token_program:TOKEN2022,quote_mint:ZERO} as Record<string,string>)[name]??ZERO;
  if(t==='bool')return name==='is_buy';if(t==='string')return name==='ix_name'?'buy_v3':'INVENTED OFFLINE';
  if(t==='i64')return '1792670400';return '1000000';
 }
 function encode(t:Field['type'],v:unknown):Buffer {
  if(typeof t==='object'){const list=v as Record<string,unknown>[];const len=Buffer.alloc(4);len.writeUInt32LE(list.length);return Buffer.concat([len,...list.map(x=>Buffer.concat((contract.types as Record<string,Field[]>)[t.vec.defined.name].map(f=>encode(f.type,x[f.name]))))]);}
  if(t==='pubkey')return bytes58(v,32);
  if(t==='bool')return Buffer.from([v?1:0]);
  if(t==='string'){const b=Buffer.from(v as string),n=Buffer.alloc(4);n.writeUInt32LE(b.length);return Buffer.concat([n,b]);}
  if(t==='u8')return Buffer.from([Number(v)%256]);
  if(t==='u16'){const b=Buffer.alloc(2);b.writeUInt16LE(Number(v));return b;}
  const b=Buffer.alloc(8);if(t==='i64')b.writeBigInt64LE(BigInt(v as string));else b.writeBigUInt64LE(BigInt(v as string));return b;
 }
 return Buffer.concat([Buffer.from((contract.events as Record<string,number[]>)[kind]),fields(kind)]);
}
export function fixture(options:{kind?:string;instruction?:string;fields?:Record<string,unknown>;finality?:'processed'|'confirmed'|'finalized';slot?:number;seed?:number;at?:string;quote?:string}={}):Receipt {
 const kind=options.kind??'CreateEvent',name=options.instruction??(kind==='CreateEvent'?'create_v2':kind==='CompletePumpAmmMigrationEvent'?'migrate':'buy_v3');
 const spec=(contract.instructions as Record<string,{discriminator:number[];accounts:string[]}>)[name],mint=SYNTHETIC_MINT,q=options.quote??ZERO;
 const accounts=spec.accounts.map(n=>({mint,base_mint:mint,bonding_curve:curve(mint),event_authority:eventAuthority,program:PROGRAM,token_program:name==='create'?TOKEN:TOKEN2022,base_token_program:TOKEN2022,quote_mint:q===ZERO?WSOL:q} as Record<string,string>)[n]??ZERO);
 if(name==='create_v2'&&q!==ZERO)accounts.push(q,ZERO,TOKEN);
 const keys=[PROGRAM,...accounts],sign=base58(Buffer.alloc(64,options.seed??1)),slot=options.slot??100;
 const body={jsonrpc:'2.0',id:1,result:{slot,blockTime:1792670400,transaction:{signatures:[sign],message:{accountKeys:keys,instructions:[{programIdIndex:0,accounts:accounts.map((_,i)=>i+1),data:base58(Buffer.from(spec.discriminator))}]}},meta:{err:null,innerInstructions:[{index:0,instructions:[{programIdIndex:0,accounts:[keys.indexOf(eventAuthority)],stackHeight:2,data:base58(Buffer.concat([EVENT_CPI,syntheticEvent(kind,{quote_mint:q,...(name==='create'?{token_program:TOKEN}:{}),...options.fields})]))}]}]}}};
 return {origin:'SYNTHETIC_OFFLINE',network:'solana-mainnet-beta',mintHint:mint,signature:sign,receivedAt:options.at??AT,availableAt:options.at??AT,transactionRequestJson:JSON.stringify({jsonrpc:'2.0',id:1,method:'getTransaction',params:[sign,{encoding:'json',commitment:'confirmed',maxSupportedTransactionVersion:0}]}),transactionJson:JSON.stringify(body),statusRequestJson:JSON.stringify({jsonrpc:'2.0',id:2,method:'getSignatureStatuses',params:[[sign],{searchTransactionHistory:true}]}),statusJson:JSON.stringify({jsonrpc:'2.0',id:2,result:{context:{slot:slot+1},value:[{slot,err:null,confirmationStatus:options.finality??'finalized',confirmations:options.finality&&options.finality!=='finalized'?1:null}]}})};
}
export function demo(){
 const creation=fixture({finality:'processed'});
 const finalized=fixture({at:'2026-10-22T12:00:12.000Z'});
 const trade=fixture({kind:'TradeEvent',seed:2,slot:101,at:'2026-10-22T12:00:20.000Z',fields:{timestamp:'1792670415',token_amount:'9007199254740993',quote_amount:'120000000'}});
 // Rejected, unpriced second candidate remains in the denominator; no survivor substitution.
 const bad=fixture({seed:3,at:'2026-10-22T12:00:21.000Z',fields:{mint:SYNTHETIC_OTHER_MINT}});bad.mintHint=SYNTHETIC_OTHER_MINT;
 return [creation,finalized,trade,bad];
}
