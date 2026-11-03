import {data} from '../v4-helius-pilot/server/profile';
import {isExactPublicKey,utcMicros} from '../onchain-mint/validation';
import {plain,raw} from '../v4-oracle/farming/validation';
import {TOKEN_PROGRAM} from '../onchain-mint/policy';
import type {DecodedTransferV1,EvidenceReferenceV1,TransfersV1} from './contract';
const need=(ok:unknown)=>{if(!ok)throw Error('invalid_transfer_candidates');};
export function transferAnalysis(input:unknown,mint:string|null,evaluatedAt:string|null,refs:EvidenceReferenceV1[]):TransfersV1{
 const empty=(reason:string):TransfersV1=>({state:'not_established',reason,fromUtc:null,toUtc:null,scope:'supplied_transactions_only',completeWalletHistory:false,beneficialOwnership:'unknown',instructionCount:0,instructionAmountRaw:null,edges:[]});
 if(input===undefined)return empty('no_history_supplied');
 try{
  // Reuse bounded JSON traversal; reject accessors/cycles before reading or copying any event.
  plain(input);need(data(input,['kind','mint','fromUtc','toUtc','scope','enumeration','parser','events']));
  const w=input as Record<string,unknown>,now=utcMicros(evaluatedAt),from=utcMicros(w.fromUtc),to=utcMicros(w.toUtc);
  need(mint&&w.mint===mint&&['synthetic_fixture','recorded_response'].includes(String(w.kind))&&now!==null&&from!==null&&to!==null&&to>from&&to<=now&&to-from<=3600000000n&&now-to<=60000000n);
  need(w.scope==='supplied_transactions_only'&&w.enumeration==='complete_declared_scope'&&w.parser==='reviewed_spl_transfer_candidate_v1');
  need(Array.isArray(w.events)&&w.events.length>0&&w.events.length<=64);
  const seen=new Set<string>(),transactions=new Map<string,string>(),groups=new Map<string,{fromTokenAccount:string;toTokenAccount:string;instructionAmountRaw:string;instructionCount:number;evidenceIds:string[]}>(),pending:EvidenceReferenceV1[]=[];let total=0n;
  for(const value of w.events as unknown[]){
   need(data(value,['signature','instructionIndex','slot','blockTime','mint','program','fromTokenAccount','toTokenAccount','instructionAmountRaw','succeeded','reference']));
   const t=value as DecodedTransferV1,block=utcMicros(t.blockTime);
   need(typeof t.signature==='string'&&/^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(t.signature)&&Number.isInteger(t.instructionIndex)&&t.instructionIndex>=0&&t.instructionIndex<=4095);
   need(typeof t.slot==='string'&&/^[1-9]\d{0,15}$/.test(t.slot)&&BigInt(t.slot)<=BigInt(Number.MAX_SAFE_INTEGER));
   need(t.mint===mint&&t.program===TOKEN_PROGRAM&&t.succeeded===true&&isExactPublicKey(t.fromTokenAccount)&&isExactPublicKey(t.toTokenAccount)&&t.fromTokenAccount!==t.toTokenAccount&&block!==null&&block>=from!&&block<=to!);
   const n=raw(t.instructionAmountRaw);need(n>0n);
   const id=t.signature+':'+t.instructionIndex;need(!seen.has(id));seen.add(id);
   const r=t.reference;
   need(data(r,['id','kind','providerHost','method','requestSha256','responseSha256','accountDataSha256','fieldPath','requestStartedAt','receivedAt','contextSlot','commitmentRequested','commitmentEvidence','blockTime']));
   need(r.kind===w.kind&&r.method==='getTransaction'&&typeof r.providerHost==='string'&&['mainnet.helius-rpc.com','api.mainnet.solana.com','api.mainnet-beta.solana.com'].includes(r.providerHost));
   for(const h of [r.requestSha256,r.responseSha256])need(typeof h==='string'&&/^[a-f0-9]{64}$/.test(h));
   need(r.accountDataSha256===null&&r.contextSlot===t.slot&&r.commitmentRequested==='finalized'&&r.commitmentEvidence==='request_only_not_independent_finality_proof');
   need(typeof r.fieldPath==='string'&&r.fieldPath==='$.result.transaction.message.instructions['+t.instructionIndex+']');
   const start=utcMicros(r.requestStartedAt),received=utcMicros(r.receivedAt);
   need(start!==null&&received!==null&&start<=received&&received-start<=5000000n&&block!<=received&&received<=now!&&now!-received<=60000000n);
   need(data(r.blockTime,['slot','utc','assurance'])&&r.blockTime!.slot===t.slot&&r.blockTime!.utc===t.blockTime&&r.blockTime!.assurance==='rpc_block_time_estimate');
   const binding=[t.slot,t.blockTime,r.responseSha256,r.requestSha256,r.providerHost].join(':');need(!transactions.has(t.signature)||transactions.get(t.signature)===binding);transactions.set(t.signature,binding);
   const refId='tx-'+id;pending.push({...r,id:refId,blockTime:{...r.blockTime!}});
   const k=t.fromTokenAccount+':'+t.toTokenAccount,g=groups.get(k)??{fromTokenAccount:t.fromTokenAccount,toTokenAccount:t.toTokenAccount,instructionAmountRaw:'0',instructionCount:0,evidenceIds:[]};
   g.instructionAmountRaw=String(BigInt(g.instructionAmountRaw)+n);g.instructionCount++;g.evidenceIds.push(refId);groups.set(k,g);total+=n;
  }
  refs.push(...pending);
  return {state:'candidate',reason:'supplied_decoded_instructions_not_authenticated_history',fromUtc:w.fromUtc as string,toUtc:w.toUtc as string,scope:'supplied_transactions_only',completeWalletHistory:false,beneficialOwnership:'unknown',instructionCount:seen.size,instructionAmountRaw:String(total),edges:[...groups.values()]};
 }catch{return empty('incomplete_unsupported_or_invalid_transfer_candidates');}
}
