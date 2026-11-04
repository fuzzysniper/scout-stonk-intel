import 'server-only';
import {freeze,isExactPublicKey,utcMicros} from '../onchain-mint/validation';
import {inspectEvidence} from '../v4-oracle/onchain/evidence';
import {inspectHolderEvidence} from '../v4-oracle/holders/decode';
import {data} from '../v4-helius-pilot/server/profile';
import type {HolderSample} from '../v4-oracle/holders/contract';
import type {ConcentrationV1,Controls,EvidenceReferenceV1,NativeEvidenceInputV1,NativeEvidenceV1,NativeFindingV1,RatioV1} from './contract';
import {transferAnalysis} from './transfers';
import {inspectBatchMint} from './holder';
import {inspectHeliusEvidence} from './helius-qualification';
import type {QualifiedHolderSampleV1} from './helius-contract';
type AnalyticHolderSample=HolderSample|QualifiedHolderSampleV1;
const batchMint=(cap:unknown)=>inspectBatchMint(cap)??inspectHeliusEvidence(cap)?.controls??null;

export const NATIVE_RULES=Object.freeze({version:'native-evidence/1',maxAgeMs:60000,topAccounts:10,flagBps:5000,maxTransfers:64,maxTransferWindowMs:3600000} as const);
export const ratio=(n:bigint,d:bigint):RatioV1=>{if(typeof n!=='bigint'||typeof d!=='bigint'||n<0n||d<0n)throw Error('invalid_unsigned_ratio');return {numeratorRaw:String(n),denominatorRaw:String(d),basisPointsFloor:d===0n?null:String(n*10000n/d)};};
const absentConcentration=(reason:string):ConcentrationV1=>({state:'not_established',reason,supplyRaw:null,decimals:null,selectionSlot:null,balanceSlot:null,selectionCount:0,observedAccountCount:0,selectionAmountsChanged:0,atomicAcrossCalls:false,minContextSlotIsLowerBoundOnly:true,fullHolderCoverage:false,beneficialOwnership:'unknown',population:'previously_selected_largest_token_accounts_only',exclusions:[],selectedTotal:null,largestObservedAccount:null,largestObserved10Accounts:null,accounts:[],ownerGroups:[]});
const coverage={fullHolderCoverage:false,beneficialOwnership:'unknown',suspectedRelationships:'not_established',accountClassifications:'not_supplied_no_exclusions',price:'not_established',momentum:'not_established',exitCapacity:'not_established',walletHistory:'not_established'} as const;
const limits=['Candidate evidence only; RPC-served account state is not independent validator replay.','A token-account authority address is not a person or beneficial owner.'];
const fresh=(at:string,now:bigint,original?:string)=>{const t=utcMicros(at),o=original===undefined?t:utcMicros(original);return t!==null&&o!==null&&now>=o&&now>=t&&now-t<=60000000n;};
const controlsIds=['mint-identity','mint-authority','freeze-authority','permanent-delegate','transfer-hook','transfer-fees','transfer-restrictions'] as const;
function controlFindings(c:Controls|null,ref:string|null):NativeFindingV1[]{
 const f=(id:string,title:string,tone:NativeFindingV1['tone'],summary:string):NativeFindingV1=>({id:'native-'+id,rule:'native-controls/1',state:c?'candidate':'not_established',tone,title,summary,evidenceIds:ref?[ref]:[],limitations:[...limits,'GREEN is only the stated narrow control absence, never token safety, a revocation event or exitability.']});
 if(!c)return controlsIds.map(id=>f(id,id,'gray','No current qualified mint controls.'));
 const complete=c.extensionCoverage==='complete_reviewed',absence=complete?'green':'gray';
 const rows:NativeFindingV1[]=[f('mint-identity','Mint layout','green','Initialized '+c.program+' mint; raw supply '+c.rawSupply+' with '+c.decimals+' decimals. No issuer/backing claim.')];
 for(const [id,v]of [['mint-authority',c.mintAuthority],['freeze-authority',c.freezeAuthority]]as const)rows.push(f(id,id,v?'red':absence,v?'Base permission is present at '+v+'; actual signer/PDA/multisig control and intent unknown.':complete?'Base permission is absent in this captured layout; no past revocation event proven.':'Base permission null, but unknown extensions prevent absence-based clearance.'));
 rows.push(f('permanent-delegate','Permanent delegate',c.permanentDelegate?'red':absence,c.permanentDelegate?'Delegate '+c.permanentDelegate+' can transfer/burn under this permission; beneficial control unknown.':complete?'No permanent delegate configured in reviewed layout.':'Extension coverage incomplete; delegate absence not established.'));
 rows.push(f('transfer-hook','Transfer hook',c.transferHook?.authority||c.transferHook?.programId?'yellow':absence,c.transferHook?.authority||c.transferHook?.programId?'Hook/update authority present; program behavior and transfer compatibility unknown.':complete?'No hook/update authority configured in reviewed layout.':'Unsupported extensions; hook absence not established.'));
 const fee=c.transferFee,feeRisk=!!fee&&(fee.configAuthority!==null||fee.withdrawWithheldAuthority!==null||fee.withheldRaw!=='0'||fee.older.basisPoints!==0||fee.newer.basisPoints!==0);
 rows.push(f('transfer-fees','Transfer fee controls',feeRisk?'yellow':absence,fee?'Exact older/newer fee schedules retained in controls; active epoch/rate unknown. Withheld fee custody is not LP custody or ROI.':complete?'No transfer fee configuration in reviewed layout.':'Fee coverage incomplete; no zero-tax claim.'));
 const restricted=c.nonTransferable||c.defaultAccountState==='frozen'||!!c.pausable?.paused,mutable=!!c.pausable?.authority||!!c.mintCloseAuthority;
 rows.push(f('transfer-restrictions','Other transfer controls',restricted?'red':!complete?'gray':mutable?'yellow':'green',restricted?'Non-transferable, default-frozen or paused control present; actual account state/route remains separate.':!complete?'Unsupported extension IDs '+c.unsupported.join(',')+'; no general absence clearance.':mutable?'Additional pause/close authority present.':'No reviewed mint-level restriction configured; per-account controls and route remain unchecked.'));
 return rows;
}
function holderRefs(s:AnalyticHolderSample):EvidenceReferenceV1[]{
 const time={slot:s.snapshotSlot,utc:s.sourceAt,assurance:'rpc_block_time_estimate' as const};
 return s.source.map((r,i)=>({id:'holder-rpc-'+i,kind:s.kind,providerHost:r.endpointHost,method:r.method,requestSha256:r.requestSha256,responseSha256:r.responseSha256,accountDataSha256:null,fieldPath:r.fieldPath,requestStartedAt:r.requestStartedAt,receivedAt:r.receivedAt,contextSlot:r.method==='getBlockTime'?null:r.contextSlot,commitmentRequested:r.method==='getBlockTime'?null:'finalized',commitmentEvidence:r.method==='getBlockTime'?'not_in_method':'request_only_not_independent_finality_proof',blockTime:i===0?null:time}));
}
function concentration(s:AnalyticHolderSample,refs:EvidenceReferenceV1[],reason:string|null):ConcentrationV1{
 const base={...absentConcentration(reason??'supported_selected_sample'),supplyRaw:s.supplyRaw,decimals:s.decimals,selectionSlot:s.selectionSlot,balanceSlot:s.snapshotSlot,selectionCount:s.accounts.length,observedAccountCount:s.accounts.length,selectionAmountsChanged:s.selectionAmountsChanged};
 const snapshot=refs.find(r=>r.id==='holder-rpc-1')!;
 // Original decoder bounds identity, order, slots, response/account bytes and total/supply when supported.
 if(reason||!s.supportedBalanceSemantics||s.supplyRaw==='0'||!s.accounts.length)return {...base,reason:reason??(!s.supportedBalanceSemantics?'unsupported_balance_semantics':s.supplyRaw==='0'?'zero_supply':'empty_selection')};
 const d=BigInt(s.supplyRaw),accounts=s.accounts.map(a=>{
  const id='holder-account-'+a.account;refs.push({...snapshot,id,accountDataSha256:a.accountDataSha256,fieldPath:a.fieldPath});
  return {account:a.account,ownerAddress:a.tokenOwner,amountRaw:a.amountRaw,selectionAmountRaw:a.selectionAmountRaw,state:a.state,evidenceId:id};
 }).sort((a,b)=>BigInt(a.amountRaw)>BigInt(b.amountRaw)?-1:BigInt(a.amountRaw)<BigInt(b.amountRaw)?1:a.account<b.account?-1:1);
 const total=accounts.reduce((n,a)=>n+BigInt(a.amountRaw),0n);
 if(total>d)return {...base,reason:'sample_exceeds_supply'};
 const groups=new Map<string,typeof accounts>();for(const a of accounts)groups.set(a.ownerAddress,[...(groups.get(a.ownerAddress)??[]),a]);
 const ownerGroups=[...groups].map(([ownerAddress,as])=>{const n=as.reduce((v,a)=>v+BigInt(a.amountRaw),0n);return {ownerAddress,accounts:as.map(a=>a.account).sort(),amountRaw:String(n),shareOfSupply:ratio(n,d),evidenceIds:as.map(a=>a.evidenceId)};})
  .sort((a,b)=>BigInt(a.amountRaw)>BigInt(b.amountRaw)?-1:BigInt(a.amountRaw)<BigInt(b.amountRaw)?1:a.ownerAddress<b.ownerAddress?-1:1);
 return {...base,state:'candidate',reason:s.selectionAmountsChanged?'balances_changed_not_current_top_ranking':'supported_selected_sample',accounts,ownerGroups,selectedTotal:ratio(total,d),largestObservedAccount:ratio(BigInt(accounts[0].amountRaw),d),largestObserved10Accounts:ratio(accounts.slice(0,10).reduce((n,a)=>n+BigInt(a.amountRaw),0n),d)};
}
/** Pure deterministic analytics. Only original process-local decoder records are readable; never authenticates origin. */
export function analyzeNativeEvidence(input:NativeEvidenceInputV1|unknown):NativeEvidenceV1{
 const findings:NativeFindingV1[]=[],references:EvidenceReferenceV1[]=[];
 let mint:string|null=null,evaluatedAt:string|null=null,controls:Controls|null=null,mintSnapshot:NativeEvidenceV1['mintSnapshot']=null,consistency:NativeEvidenceV1['consistency']='not_compared',sample:AnalyticHolderSample|null=null,reason:string|null=null;
 const kinds=new Set<string>();
 const valid=(()=>{try{return data(input,['mint','evaluatedAt'],['mintEvidence','holderEvidence','transfers'])&&isExactPublicKey(input.mint)&&typeof input.evaluatedAt==='string'&&utcMicros(input.evaluatedAt)!==null;}catch{return false;}})();
 if(valid&&data(input,['mint','evaluatedAt'],['mintEvidence','holderEvidence','transfers'])){
  mint=input.mint as string;evaluatedAt=input.evaluatedAt as string;const now=utcMicros(evaluatedAt)!;
  const m=inspectEvidence(input.mintEvidence),s=inspectHolderEvidence(input.holderEvidence)?.sample??inspectHeliusEvidence(input.holderEvidence)?.sample??null;
  if(m?.source&&m.mint===mint){
   const r=m.source;kinds.add(r.kind);references.push({id:'mint-account',kind:r.kind,providerHost:r.endpointHost,method:r.method,requestSha256:null,responseSha256:r.responseSha256,accountDataSha256:r.accountDataSha256,fieldPath:'$.result.value.data',requestStartedAt:r.requestStartedAt,receivedAt:r.receivedAt,contextSlot:r.contextSlot,commitmentRequested:r.commitment,commitmentEvidence:'request_only_not_independent_finality_proof',blockTime:null});
   if(fresh(r.receivedAt,now,r.evaluatedAt)&&m.controls){controls=m.controls;mintSnapshot={contextSlot:r.contextSlot,supplyRaw:controls.rawSupply,decimals:controls.decimals,evidenceId:'mint-account'};}
  }
  if(s&&s.mint===mint){
   sample=s;kinds.add(s.kind);references.push(...holderRefs(s));const snapshot=references.find(r=>r.id==='holder-rpc-1')!;
   references.push({...snapshot,id:'holder-mint',fieldPath:'$.result.value[0].data',accountDataSha256:s.mintAccountDataSha256});
   const block=utcMicros(s.sourceAt);if(!s.source.every(r=>fresh(r.receivedAt,now))||block===null||now<block||now-block>120000000n)reason='stale_or_future_sample';
   if(!mintSnapshot&&!reason){const batch=batchMint(input.holderEvidence);if(batch){controls=batch;mintSnapshot={contextSlot:s.snapshotSlot,supplyRaw:batch.rawSupply,decimals:batch.decimals,evidenceId:'holder-mint'};}}
   if(controls&&mintSnapshot){
    const same=mintSnapshot.contextSlot===s.snapshotSlot;
    const batch=batchMint(input.holderEvidence),accountHash=references.find(r=>r.id===mintSnapshot!.evidenceId)?.accountDataSha256??null;
    const incompatible=controls.ownerProgram!==s.mintProgram||controls.decimals!==s.decimals;
    const baseDiff=batch&&(controls.mintAuthority!==batch.mintAuthority||controls.freezeAuthority!==batch.freezeAuthority);
    const controlState=(c:Controls)=>JSON.stringify({...c,rawSupply:'omitted_for_control_comparison'});
    const controlDiff=batch&&controls.extensionCoverage==='complete_reviewed'&&batch.extensionCoverage==='complete_reviewed'&&controlState(controls)!==controlState(batch);
    const different=controls.rawSupply!==s.supplyRaw||accountHash!==null&&accountHash!==s.mintAccountDataSha256;
    consistency=incompatible||baseDiff||controlDiff||same&&different?'conflict':same?(accountHash?'same_mint_snapshot':'not_compared'):'different_context';
    if(consistency==='conflict'){reason='conflicting_mint_snapshots';controls=null;}
    else if(same&&!accountHash&&batch){controls=batch;mintSnapshot={contextSlot:s.snapshotSlot,supplyRaw:batch.rawSupply,decimals:batch.decimals,evidenceId:'holder-mint'};}
   }
  }
 }
 let conc=absentConcentration(valid?'missing_qualified_holder_sample':'invalid_input');
 if(sample)conc=concentration(sample,references,reason);
 findings.push(...controlFindings(controls,mintSnapshot?.evidenceId??null));
 for(const [id,title,value]of [
  ['selected-share','Selected account share',conc.selectedTotal],
  ['top10-share','Largest 10 within observed selection',conc.largestObserved10Accounts],
  ['owner-share','Largest sampled token-owner group',conc.ownerGroups[0]?.shareOfSupply??null]
 ]as const){
  const tone=value&&value.basisPointsFloor!==null?(BigInt(value.numeratorRaw)*10000n>=BigInt(value.denominatorRaw)*5000n?'red':'yellow'):'gray';
  findings.push({id:'native-'+id,rule:'native-concentration/1',state:conc.state,tone,title,summary:value?'Exact sampled raw balance / same-batch decoded supply. 50% flag is a screening threshold, not fraud probability.':'Not established: '+conc.reason,evidenceIds:sample?references.filter(r=>r.id.startsWith('holder-')).map(r=>r.id):[],limitations:[...limits,'Selected largest accounts at an earlier slot; no complete/current top-holder or human ownership ranking. No pool/vault/CEX exclusions.']});
 }
 const transfers=transferAnalysis(valid?(input as NativeEvidenceInputV1).transfers:undefined,mint,evaluatedAt,references);
 if(valid&&transfers.state==='candidate'&&data((input as NativeEvidenceInputV1).transfers,['kind','mint','fromUtc','toUtc','scope','enumeration','parser','events']))kinds.add(String(((input as NativeEvidenceInputV1).transfers as {kind:unknown}).kind));
 findings.push({id:'native-transfers',rule:'native-transfers/1',state:transfers.state,tone:transfers.state==='candidate'?'yellow':'gray',title:'Supplied transfer instructions',summary:transfers.state==='candidate'?'Explicit decoded instruction amounts only; no funding/collusion or net-balance inference.':'Not established: '+transfers.reason,evidenceIds:references.filter(r=>r.id.startsWith('tx-')).map(r=>r.id),limitations:[...limits,'No earliest buyers, complete wallet history, wash trading, price, momentum or executable return inferred.']});
 for(const [id,title]of [['coverage','Ownership/relationships'],['exit','Price, momentum and exit capacity']]as const)findings.push({id:'native-'+id,rule:'native-coverage/1',state:'not_established',tone:'gray',title,summary:'Not established by these observations.',evidenceIds:[],limitations:[...limits,'Unobserved distribution, beneficial ownership and economic activity remain unknown.']});
 if(consistency==='conflict')findings.push({id:'native-conflict',rule:'native-coverage/1',state:'not_established',tone:'gray',title:'Conflicting mint evidence',summary:'Incompatible mint identity/decimals/program or same-slot bytes. Both snapshots retained; no silent reconciliation.',evidenceIds:['mint-account','holder-mint'],limitations:limits});
 const state=controls||conc.state==='candidate'||transfers.state==='candidate'?'candidate':'unavailable';
 const label=kinds.size>1?'MIXED OFFLINE CANDIDATES':kinds.has('synthetic_fixture')?'SYNTHETIC OFFLINE':kinds.has('recorded_response')?'RECORDED / ORIGIN UNVERIFIED':'NO QUALIFIED EVIDENCE';
 return freeze({version:'native-evidence/1',mint,evaluatedAt,state,origin:{status:'candidate_only',providerAuthenticated:false,label},controls,mintSnapshot,consistency,concentration:conc,transfers,findings,references,coverage});
}
