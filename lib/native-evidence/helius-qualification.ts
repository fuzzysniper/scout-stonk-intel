import 'server-only';
import {numericJson,integer} from '../v4-ca-intelligence/decimal';
import {data} from '../v4-helius-pilot/server/profile';
import {freeze,isExactPublicKey} from '../onchain-mint/validation';
import {clock,raw} from '../v4-oracle/farming/validation';
import {decodeMintBytes,requireValue as need} from '../v4-oracle/onchain/bytes';
import {accountBytes,decodeTokenAccount,hash} from '../v4-oracle/holders/accounts';
import {largestRequest,accountsRequest,clockRequest,HOLDER_BOUNDS as B} from '../v4-oracle/holders/requests';
import type {NativeEvidenceInputV1} from './contract';
import type {HeliusCaptureV1,HeliusHolderEvidenceV1,HeliusHolderResultV1,QualifiedHolderSourceV1,HeliusRawBatchV1} from './helius-contract';

const admitted=new WeakMap<HeliusHolderEvidenceV1,HeliusHolderResultV1>();
const evaluations=new WeakMap<HeliusHolderEvidenceV1,string>();
const unavailable=():HeliusHolderEvidenceV1=>seal({state:'unavailable',reason:'missing_stale_inconsistent_or_malformed_helius_batch',sample:null,controls:null,rightsReviewSha256:null,providerAuthenticated:false});
function seal(value:HeliusHolderResultV1,evaluatedAt?:string):HeliusHolderEvidenceV1{const cap=Object.freeze({}) as HeliusHolderEvidenceV1;admitted.set(cap,freeze(value));if(evaluatedAt!==undefined)evaluations.set(cap,evaluatedAt);return cap;}
export const inspectHeliusEvidence=(cap:unknown):HeliusHolderResultV1|null=>cap&&typeof cap==='object'?admitted.get(cap as HeliusHolderEvidenceV1)??null:null;
type Captured={value:Record<string,unknown>;lexemes:Record<string,unknown>;source:QualifiedHolderSourceV1};
/** Exact original wire hashes; endpoint is genuinely Helius, never a remapped public-RPC host.
 * A host/method/hash is captured metadata, NOT TLS authentication or source authorization.
 */
function capture(input:unknown,method:QualifiedHolderSourceV1['method'],id:number,now:number,owned:Buffer[]):Captured{
 need(data(input,['endpointHost','requestBody','responseBytes','httpStatus','requestStartedAt','receivedAt']));
 const c=input as HeliusCaptureV1;
 need(c.endpointHost==='mainnet.helius-rpc.com'&&c.httpStatus===200&&typeof c.requestBody==='string'&&Buffer.byteLength(c.requestBody)<=2048);
 need(c.responseBytes instanceof Uint8Array&&c.responseBytes.byteLength>0&&c.responseBytes.byteLength<=B.maxResponseBytes);
 const bytes=Buffer.from(c.responseBytes);owned.push(bytes);
 // Snapshot all primitives before parsing; never trust a caller-supplied digest.
 const requestBody=c.requestBody,requestStartedAt=c.requestStartedAt,receivedAt=c.receivedAt;
 const started=clock(requestStartedAt),received=clock(receivedAt);
 need(started<=received&&received<=now&&received-started<=B.timeoutMs&&now-received<=B.freshnessMs);
 const responseSha256=hash(bytes),p=numericJson(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 need(data(p.value,['jsonrpc','id','result'])&&data(p.lexemes,['jsonrpc','id','result']));
 const value=p.value as Record<string,unknown>,lexemes=p.lexemes as Record<string,unknown>;
 need(value.jsonrpc==='2.0'&&value.id===id&&lexemes.id===String(id));
 return {value,lexemes,source:{endpointHost:'mainnet.helius-rpc.com',method,requestBody,requestSha256:hash(requestBody),responseSha256,requestStartedAt,receivedAt,contextSlot:null,fieldPath:'$.result'}};
}
function context(c:Captured){
 need(data(c.value.result,['context','value'])&&data(c.lexemes.result,['context','value']));
 const r=c.value.result as Record<string,unknown>,l=c.lexemes.result as Record<string,unknown>;
 need(data(r.context,['slot'],['apiVersion'])&&data(l.context,['slot'],['apiVersion']));
 const v=r.context as Record<string,unknown>,x=l.context as Record<string,unknown>;
 need(typeof v.slot==='number'&&Number.isSafeInteger(v.slot)&&v.slot>0&&integer(x.slot)===String(v.slot));
 if(v.apiVersion!==undefined)need(typeof v.apiVersion==='string'&&/^[0-9A-Za-z.+-]{1,32}$/.test(v.apiVersion));
 need(Array.isArray(r.value)&&Array.isArray(l.value));
 return {slot:v.slot as number,values:r.value as unknown[],lexemes:l.value as unknown[]};
}
/** New process-local Helius capability. Reuses original account and mint binary readers.
 * Mirrors required standard-RPC envelope/request/selection/clock bounds without editing #262.
 * No imported old decoder cap, host substitution, getAccountInfo construction or transport.
 */
export function qualifyHeliusBatch(input:unknown):HeliusHolderEvidenceV1{
 const owned:Buffer[]=[];
 try{
  need(data(input,['kind','mint','evaluatedAt','selection','snapshot','clock','rightsReviewSha256']));
  const i=input as HeliusRawBatchV1;
  need(['synthetic_fixture','recorded_response'].includes(i.kind)&&isExactPublicKey(i.mint)&&typeof i.rightsReviewSha256==='string'&&/^[a-f0-9]{64}$/.test(i.rightsReviewSha256)&&i.rightsReviewSha256!=='0'.repeat(64));
  const kind=i.kind,mint=i.mint,evaluatedAt=i.evaluatedAt,rightsReviewSha256=i.rightsReviewSha256,now=clock(evaluatedAt);
  const selection=capture(i.selection,'getTokenLargestAccounts',260001,now,owned),s=context(selection);
  need(selection.source.requestBody===largestRequest(mint)&&s.values.length<=B.maxAccounts);
  const chosen:{account:string;amountRaw:string;decimals:number}[]=[];let last=(1n<<64n)-1n;
  for(let n=0;n<s.values.length;n++){
   const v=s.values[n],x=s.lexemes[n];need(data(v,['address','amount','decimals'],['uiAmount','uiAmountString'])&&data(x,['address','amount','decimals'],['uiAmount','uiAmountString']));
   need(isExactPublicKey(v.address)&&typeof v.amount==='string'&&raw(v.amount)<=last&&typeof v.decimals==='number'&&Number.isInteger(v.decimals)&&v.decimals>=0&&v.decimals<=255&&integer(x.decimals)===String(v.decimals));
   chosen.push({account:v.address,amountRaw:v.amount,decimals:v.decimals});last=raw(v.amount);
  }
  need(new Set(chosen.map(a=>a.account)).size===chosen.length);
  const snapshot=capture(i.snapshot,'getMultipleAccounts',260002,now,owned),m=context(snapshot);
  need(snapshot.source.requestBody===accountsRequest(mint,chosen.map(a=>a.account),s.slot));
  need(m.slot>=s.slot&&m.slot-s.slot<=B.maxSlotAdvance&&m.values.length===chosen.length+1);
  const mintAccount=accountBytes(m.values[0],m.lexemes[0]);owned.push(mintAccount.bytes);
  const controls=decodeMintBytes(mintAccount.bytes,mintAccount.program);need(chosen.every(a=>a.decimals===controls.decimals));
  const accounts=chosen.map((a,n)=>{
   const parsed=accountBytes(m.values[n+1],m.lexemes[n+1],mintAccount.program);owned.push(parsed.bytes);
   const result=decodeTokenAccount(parsed.bytes,parsed.program,mint,a.account,a.amountRaw,'$.result.value['+(n+1)+'].data');
   if(m.slot===s.slot)need(result.amountRaw===a.amountRaw);
   return result;
  });
  const time=capture(i.clock,'getBlockTime',260003,now,owned);need(time.source.requestBody===clockRequest(m.slot));
  need(clock(selection.source.receivedAt)<=clock(snapshot.source.requestStartedAt)&&clock(snapshot.source.receivedAt)<=clock(time.source.requestStartedAt));
  need(clock(snapshot.source.requestStartedAt)-clock(selection.source.requestStartedAt)>=2500&&clock(time.source.requestStartedAt)-clock(snapshot.source.requestStartedAt)>=2500);
  need(clock(time.source.receivedAt)-clock(selection.source.requestStartedAt)<=B.batchMs);
  const seconds=integer(time.lexemes.result,253402300799n);need(typeof time.value.result==='number'&&seconds!==null);
  const sourceMs=Number(BigInt(seconds!)*1000n);need(sourceMs<=clock(snapshot.source.receivedAt)&&now-sourceMs<=B.blockAgeMs);
  const sourceAt=new Date(sourceMs).toISOString();
  const native=mint==='So11111111111111111111111111111111111111112'||accounts.some(a=>a.native);
  const supported=controls.decimals<=18&&controls.extensionTypes.length===0&&accounts.every(a=>a.unsupportedExtensions.length===0)&&!native;
  if(supported)need(accounts.reduce((n,a)=>n+BigInt(a.amountRaw),0n)<=BigInt(controls.rawSupply));
  const refs:QualifiedHolderSourceV1[]=[{...selection.source,contextSlot:String(s.slot),fieldPath:'$.result.value'},{...snapshot.source,contextSlot:String(m.slot),fieldPath:'$.result.value'},{...time.source,contextSlot:String(m.slot)}];
  return seal({state:'candidate_sample',reason:supported&&controls.rawSupply!=='0'&&accounts.length?'decoded_helius_candidate_not_authenticated':'unsupported_balance_semantics_or_empty_denominator',
   controls,rightsReviewSha256,providerAuthenticated:false,
   sample:{mint,kind,providerAuthenticated:false,assurance:'captured_request_binding_not_authenticated_native',coverage:'selected_token_accounts_only',fullHolderCoverage:false,beneficialOwnership:'unknown',supplyRaw:controls.rawSupply,decimals:controls.decimals,mintProgram:mintAccount.program,mintAccountDataSha256:hash(mintAccount.bytes),mintExtensionTypes:controls.extensionTypes,supportedBalanceSemantics:supported,selectionSlot:String(s.slot),snapshotSlot:String(m.slot),sourceAt,clockKind:'finalized_block_time_estimate',atomicAcrossCalls:false,minContextSlotIsLowerBoundOnly:true,selectionAmountsChanged:accounts.filter(a=>a.amountRaw!==a.selectionAmountRaw).length,accounts,exclusions:[],source:refs}},evaluatedAt);
 }catch{return unavailable();}
 finally{for(const b of owned)b.fill(0);}
}
/** Direct B.RawBatch -> existing analytics input; all validation must succeed first. */
export function intakeHeliusBatch(raw:unknown):NativeEvidenceInputV1|null{
 const cap=qualifyHeliusBatch(raw),r=inspectHeliusEvidence(cap);
 if(!r?.sample)return null;
 // Evaluation is the captured B completion clock, not a newly invented/freshened clock.
 return freeze({mint:r.sample.mint,evaluatedAt:evaluations.get(cap)!,holderEvidence:cap});
}
