import {strictJson} from '../consumer-mvp/evidence/strict-json';
import {freeze,utcMicros} from '../consumer-mvp/evidence/guards';
import {array,integer,PROGRAM,record,TOKEN2022,transactionEvents,USDC,ZERO,type Event} from './decode';
import {bytes58,hash} from './identity';

export type Receipt={
 origin:'SYNTHETIC_OFFLINE'|'UNVERIFIED_OFFLINE';network:'solana-mainnet-beta';
 mintHint:string;signature:string;receivedAt:string;availableAt:string;
 transactionRequestJson:string;transactionJson:string;statusRequestJson:string|null;statusJson:string|null;
};
type State='NEW'|'IDENTITY_VERIFIED'|'INSUFFICIENT'|'OBSERVE'|'REJECT';
type Trail={at:string;state:State;reason:string};
type Claim={receiptHash:string;signature:string;slot:number;event:string;instruction:number;position:number;receivedAt:string;availableAt:string;eventUnixSeconds:string;blockTime:number|null;finality:'PROVISIONAL'|'RPC_REPORTED_FINALIZED';transactionHash:string;statusHash:string|null;payloadHash:string;sourceClock:'UNVERIFIED'|'INCONSISTENT'};
export type Candidate={
 mint:string;origin:Receipt['origin'];state:State;action:'WAIT'|'REJECT';firstReceivedAt:string;
 creationTimeUtc:string|null;curve:string|null;tokenProgram:string|null;quoteMint:string|null;
 quoteUnit:'native SOL lamports'|'exact quote mint atomic units — decimals NOT OBSERVED'|null;
 stage:'UNVERIFIED'|'BONDING_CURVE_OBSERVED'|'COMPLETE_OR_MIGRATED';
 claims:Claim[];history:Trail[];activity:{sampledBuys:number;sampledSells:number;quoteAtomicSum:string;tokenAtomicSum:string;completeCoverage:false};
 unknowns:readonly string[];invalidation:readonly string[];
};
export const UNKNOWNS=Object.freeze(['No authentic acquisition in this module','Mint/freeze authorities and Token-2022 extension controls NOT OBSERVED','Holder concentration, relationships and manipulation NOT OBSERVED','Complete trade history, liquidity depth and exit capacity NOT OBSERVED','Price, market cap, returns and predictive edge NOT ESTABLISHED','Current curve state after the last sampled event NOT OBSERVED']);
const INVALIDATION=Object.freeze(['Failed/reorged transaction or conflicting identity','Quote or program mismatch, unsupported revision, inconsistent source clocks','Curve completion/migration ends this pre-migration cohort','Missing, stale or out-of-order activity cannot establish momentum']);
export function time(v:unknown):bigint{const n=utcMicros(v);if(n===null)throw Error('invalid_clock');return n;}
const json=(s:string)=>{if(typeof s!=='string'||s.length>262144)throw Error('packet_bound');return record(strictJson(s));};
function sourceTime(s:unknown):{seconds:string;utc:string|null}{
 if(typeof s!=='string'||!/^\d{1,12}$/.test(s))throw Error('invalid_event_clock');const ms=BigInt(s)*1000n;
 return {seconds:s,utc:ms<=253402300799000n?new Date(Number(ms)).toISOString():null};
}
function parse(r:Receipt){
 if(!['SYNTHETIC_OFFLINE','UNVERIFIED_OFFLINE'].includes(r.origin)||r.network!=='solana-mainnet-beta')throw Error('offline_scope');
 bytes58(r.mintHint,32);bytes58(r.signature,64);if(time(r.receivedAt)>time(r.availableAt))throw Error('clock_order');
 const request=json(r.transactionRequestJson),params=array(request.params),config=record(params[1]);
 if(request.jsonrpc!=='2.0'||request.method!=='getTransaction'||params.length!==2||params[0]!==r.signature||config.encoding!=='json'||!['processed','confirmed','finalized'].includes(config.commitment as string)||config.maxSupportedTransactionVersion!==0)throw Error('transaction_request_binding');
 const body=json(r.transactionJson);if(body.jsonrpc!=='2.0'||body.error!==undefined||body.id!==request.id||typeof body.id!=='number')throw Error('rpc_error');
 const decoded=transactionEvents(body.result,r.signature);if(decoded.events.some(e=>e.fields.mint!==r.mintHint))throw Error('mint_hint_mismatch');
 const resultBody=record(body.result),metadata=record(resultBody.meta);
 const transactionIdentity=hash(JSON.stringify({transaction:resultBody.transaction,slot:resultBody.slot,innerInstructions:metadata.innerInstructions,err:metadata.err}));
 let finality:Claim['finality']='PROVISIONAL';
 if(r.statusJson!==null){
  if(r.statusRequestJson===null)throw Error('status_request_missing');
  const req=json(r.statusRequestJson),ps=array(req.params);
  if(req.jsonrpc!=='2.0'||req.method!=='getSignatureStatuses'||ps.length!==2||array(ps[0]).length!==1||array(ps[0])[0]!==r.signature||record(ps[1]).searchTransactionHistory!==true)throw Error('status_request_binding');
  const status=json(r.statusJson);if(status.jsonrpc!=='2.0'||status.error!==undefined||status.id!==req.id||typeof status.id!=='number')throw Error('status_rpc_error');
  const result=record(status.result),values=array(result.value);if(values.length!==1)throw Error('status_scope');
  if(values[0]!==null){const s=record(values[0]);if(s.err!==null)throw Error('reorg_or_failed_status');
   if(integer(s.slot)!==decoded.slot||integer(record(result.context).slot)<decoded.slot)throw Error('status_slot');
   if(!['processed','confirmed','finalized'].includes(s.confirmationStatus as string))throw Error('invalid_finality');
   if(s.confirmationStatus==='finalized'){if(s.confirmations!==null)throw Error('invalid_finality');finality='RPC_REPORTED_FINALIZED';}
  }
 }
 return {...decoded,finality,transactionIdentity,transactionHash:hash(r.transactionJson),statusHash:r.statusJson===null?null:hash(r.statusJson)};
}
export type Report=ReturnType<typeof replay>;
/** Deterministic offline replay only. No sockets, files, acquisition, journal commands or wall clock. */
export function replay(receipts:readonly Receipt[],asOf:string){
 time(asOf);if(receipts.length>128)throw Error('replay_bound');
 const candidates=new Map<string,Candidate>(),seen=new Map<string,{hash:string;finality:Claim['finality']}>(),transactions=new Map<string,string>();
 const audit:{receiptHash:string;at:string|null;mint:string|null;result:string}[]=[];
 let previous=0n;
 const transition=(c:Candidate,s:State,at:string,reason:string)=>{c.state=s;c.action=s==='REJECT'?'REJECT':'WAIT';c.history.push({at,state:s,reason});};
 for(const r of receipts){
  const receiptHash=hash(JSON.stringify(r));let c:Candidate|undefined;
  try{
   const now=time(r.availableAt);if(now>time(asOf)){audit.push({receiptHash,at:null,mint:null,result:'NOT_AVAILABLE_AT_CUTOFF'});continue;}
   bytes58(r.mintHint,32);c=candidates.get(r.mintHint);
   if(!c){c={mint:r.mintHint,origin:r.origin,state:'NEW',action:'WAIT',firstReceivedAt:r.receivedAt,creationTimeUtc:null,curve:null,tokenProgram:null,quoteMint:null,quoteUnit:null,stage:'UNVERIFIED',claims:[],history:[],activity:{sampledBuys:0,sampledSells:0,quoteAtomicSum:'0',tokenAtomicSum:'0',completeCoverage:false},unknowns:UNKNOWNS,invalidation:INVALIDATION};candidates.set(c.mint,c);transition(c,'NEW',r.availableAt,'UNTRUSTED_MINT_HINT');}
   if(now<previous)throw Error('out_of_order_receipt');previous=now;
   const decoded=parse(r);if(c.origin!==r.origin)throw Error('mixed_origin');
   const previousTransaction=transactions.get(r.signature);
   if(previousTransaction&&previousTransaction!==decoded.transactionIdentity)throw Error('conflicting_transaction_identity');
   transactions.set(r.signature,decoded.transactionIdentity);
   let accepted=0;
   for(const event of decoded.events){
    const f=event.fields,clock=sourceTime(f.timestamp),payloadHash=hash(JSON.stringify({fields:f,slot:decoded.slot}));
    const id=[r.signature,event.instruction,event.position,event.kind].join(':'),prior=seen.get(id);
    if(prior){if(prior.hash!==payloadHash)throw Error('conflicting_revision');if(prior.finality==='RPC_REPORTED_FINALIZED'||decoded.finality==='PROVISIONAL')continue;}
    const claim:Claim={receiptHash,signature:r.signature,slot:decoded.slot,event:event.kind,instruction:event.instruction,position:event.position,receivedAt:r.receivedAt,availableAt:r.availableAt,eventUnixSeconds:clock.seconds,blockTime:decoded.blockTime,finality:decoded.finality,transactionHash:decoded.transactionHash,statusHash:decoded.statusHash,payloadHash,sourceClock:clock.utc!==null&&time(clock.utc)<=time(r.receivedAt)&&(decoded.blockTime===null||BigInt(decoded.blockTime)*1000000n<=time(r.receivedAt))?'UNVERIFIED':'INCONSISTENT'};
    const last=c.claims.at(-1);if(last&&(claim.slot<last.slot||BigInt(claim.eventUnixSeconds)<BigInt(last.eventUnixSeconds)))throw Error('out_of_order_chain_event');
    c.claims.push(claim);seen.set(id,{hash:payloadHash,finality:decoded.finality});accepted++;
    if(c.state==='REJECT')continue;
    if(claim.sourceClock==='INCONSISTENT'){transition(c,'INSUFFICIENT',r.availableAt,'SOURCE_CLOCK_INCONSISTENT');continue;}
    if(decoded.finality==='PROVISIONAL'){transition(c,'INSUFFICIENT',r.availableAt,'PROVISIONAL_NOT_AUTHENTICATED');continue;}
    apply(c,event,clock.utc,r.availableAt,transition);
   }
   audit.push({receiptHash,at:r.availableAt,mint:c.mint,result:accepted?'OFFLINE_EVIDENCE_RECORDED':'DUPLICATE_NO_CHANGE'});
  }catch(e){
   const reason=e instanceof Error?e.message:'invalid_packet';
   if(c)transition(c,'REJECT',typeof r.availableAt==='string'?r.availableAt:'INVALID_CLOCK',reason);
   audit.push({receiptHash,at:utcMicros(r.availableAt)===null?null:r.availableAt,mint:c?.mint??null,result:reason});
  }
 }
 for(const c of candidates.values()){
  const last=c.claims.at(-1);
  if(c.state!=='REJECT'&&last&&(time(asOf)-BigInt(last.eventUnixSeconds)*1000000n>60000000n||time(asOf)-time(last.availableAt)>60000000n))transition(c,'INSUFFICIENT',asOf,'ACTIVITY_OLDER_THAN_60S_RESEARCH_WINDOW');
 }
 return freeze({version:'launch-intel-offline/1' as const,assurance:'OFFLINE_ONLY_NOT_AN_AUTHENTIC_ALERT' as const,asOf,program:PROGRAM,idlRevision:'639b87fb45c3adeffa6f7c4a1bf0cb85e392bf22',candidates:[...candidates.values()],audit,liveAcquisition:'DISCONNECTED_NO_ADAPTER' as const,eligibleRealMoneyCandidates:0 as const,prices:null,returns:null,alpha:null,journalCommands:[] as readonly never[]});
}
function apply(c:Candidate,e:Event,createdAt:string|null,at:string,transition:(c:Candidate,s:State,at:string,reason:string)=>void){
 const f=e.fields;
 if(e.kind==='CreateEvent'){
  if(c.curve!==null)throw Error('duplicate_creation_identity');
  c.curve=f.bonding_curve as string;c.tokenProgram=f.token_program as string;c.quoteMint=f.quote_mint as string;c.creationTimeUtc=createdAt;
  if(![ZERO,USDC].includes(c.quoteMint)){transition(c,'REJECT',at,'QUOTE_OUTSIDE_REVIEWED_SUBSET');return;}
  c.quoteUnit=c.quoteMint===ZERO?'native SOL lamports':'exact quote mint atomic units — decimals NOT OBSERVED';c.stage='BONDING_CURVE_OBSERVED';
  transition(c,'IDENTITY_VERIFIED',at,'OFFLINE_RPC_REPORTED_FINALIZED_CREATION_BINDINGS');
  transition(c,'OBSERVE',at,c.tokenProgram===TOKEN2022?'WAIT_TOKEN2022_CONTROLS_NOT_OBSERVED':'WAIT_CONTROLS_NOT_OBSERVED');
 }else if(e.kind==='TradeEvent'){
  if(c.curve===null){transition(c,'INSUFFICIENT',at,'FINALIZED_CREATION_MISSING');return;}
  if(c.stage!=='BONDING_CURVE_OBSERVED')throw Error('activity_after_completion');
  if(f.quote_mint!==c.quoteMint)throw Error('candidate_quote_mismatch');
  if(BigInt(f.token_amount as string)===0n||BigInt(f.quote_amount as string)===0n)throw Error('zero_trade_amount');
  if(f.is_buy)c.activity.sampledBuys++;else c.activity.sampledSells++;
  c.activity.quoteAtomicSum=(BigInt(c.activity.quoteAtomicSum)+BigInt(f.quote_amount as string)).toString();
  c.activity.tokenAtomicSum=(BigInt(c.activity.tokenAtomicSum)+BigInt(f.token_amount as string)).toString();
  transition(c,'OBSERVE',at,'SAMPLED_ACTIVITY_ONLY_NO_MOMENTUM_CLAIM');
 }else {c.stage='COMPLETE_OR_MIGRATED';transition(c,'REJECT',at,'PREMIGRATION_WINDOW_ENDED');}
}

/** Read-only #150/#152 seam; preserve references, never import or change historical journals. */
export function attachResearch<T>(existing:T,research:Report){
 const v=record(existing),p=record(v.performance);
 if(v.mode!=='recorded'||record(v.policy).liveAllocationCents!==0||p.eligibleCandidates!==0||p.nav!==null||p.netReturn!==null||p.pricedGenuineOutcomes!==0||array(v.candidates).some(c=>record(record(c).qualification).state!=='INSUFFICIENT EVIDENCE'))throw Error('agent0_boundary');
 if(research.assurance!=='OFFLINE_ONLY_NOT_AN_AUTHENTIC_ALERT'||research.eligibleRealMoneyCandidates!==0)throw Error('offline_boundary');
 return Object.freeze({existing,research,journalCommands:Object.freeze([]),eligibleRealMoneyCandidates:0 as const});
}

export type Disclosure={holdings:'NONE_DECLARED'|'PRESENT'|'UNKNOWN';compensation:'NONE_DECLARED'|'PRESENT'|'UNKNOWN';associatedToken:'NONE_DECLARED'|'PRESENT'|'UNKNOWN'};
/** Review-only text. Never exports private wallets, sizes, cost basis, holdings or a public callout. */
export function socialDraft(report:Report,mint:string,disclosure:Disclosure):{state:'WITHHELD'|'FOUNDER_REVIEW_ONLY';text:string|null}{
 bytes58(mint,32);const c=report.candidates.find(c=>c.mint===mint);
 if(!c||c.origin!=='SYNTHETIC_OFFLINE'||c.state!=='OBSERVE'||!c.claims.some(c=>c.finality==='RPC_REPORTED_FINALIZED')||!disclosure||Object.keys(disclosure).sort().join(',')!=='associatedToken,compensation,holdings'||[disclosure.holdings,disclosure.compensation,disclosure.associatedToken].some(v=>!['NONE_DECLARED','PRESENT'].includes(v)))return {state:'WITHHELD',text:null};
 const d=(s:string)=>s==='PRESENT'?'present; details remain private':'none declared (not independently verified)';
 return {state:'FOUNDER_REVIEW_ONLY',text:`SYNTHETIC OFFLINE EXAMPLE — NOT A REAL ALERT. SCOUT detected a new creation; no validated trade thesis yet. Mint ${c.mint}. Creation event ${c.creationTimeUtc??'time unknown'}; first receipt ${c.firstReceivedAt}. Finality is simulated RPC-reported finalized; no independent chain replay. Partial sample, controls and exit capacity unknown. WAIT / research only. Founder/dev holdings: ${d(disclosure.holdings)}. Compensation: ${d(disclosure.compensation)}. Associated-token interest: ${d(disclosure.associatedToken)}. Not for posting; authentic social export remains disabled.`};
}
