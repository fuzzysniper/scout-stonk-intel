import {createHash} from 'node:crypto';
import {decodeResponse} from '../../onchain-mint/decoder';
import {isExactPublicKey,strictJson,utcMicros,freeze} from '../../onchain-mint/validation';
import {data} from '../../v4-helius-pilot/server/profile';
import type {Capture,Controls,OnchainEvidence,Provenance} from './contract';
import {decodeMintBytes,requireValue,strictBase64} from './bytes';
type Decoded=Readonly<{mint:string;controls:Controls|null;source:Provenance|null;reason:string|null}>;
const admitted=new WeakMap<OnchainEvidence,Decoded>();
function seal(value:Decoded):OnchainEvidence {const token=Object.freeze({}) as OnchainEvidence;admitted.set(token,freeze(value));return token;}
export const inspectEvidence=(value:unknown):Decoded|null=>value&&typeof value==='object'?admitted.get(value as OnchainEvidence)??null:null;
/** Offline capture constructor only. No native label, credential, source selection or hash accepted from callers. */
export async function decodeOnchainCapture(input:unknown):Promise<OnchainEvidence> {
 let mint='';
 try {
  requireValue(data(input,['kind','network','endpointHost','method','encoding','commitment','mint','id','requestStartedAt','receivedAt','evaluatedAt','httpDate','httpStatus','text']));
  const c=Object.freeze({...input}) as Capture;mint=isExactPublicKey(c.mint)?c.mint:'';
  requireValue(mint&&['synthetic_fixture','recorded_response'].includes(c.kind)&&c.network==='solana-mainnet'&&['mainnet.helius-rpc.com','api.mainnet-beta.solana.com'].includes(c.endpointHost)&&c.method==='getAccountInfo'&&['base64','jsonParsed'].includes(c.encoding)&&c.commitment==='finalized'&&Number.isSafeInteger(c.id)&&c.id>0&&c.httpStatus===200);
  requireValue(typeof c.text==='string'&&Buffer.byteLength(c.text,'utf8')<=65536);
  const start=utcMicros(c.requestStartedAt),received=utcMicros(c.receivedAt),evaluated=utcMicros(c.evaluatedAt);
  requireValue(start!==null&&received!==null&&evaluated!==null&&start<=received&&received<=evaluated&&received-start<=5000000n&&evaluated-received<=60000000n);
  if(c.httpDate!==null){requireValue(typeof c.httpDate==='string'&&c.httpDate.length<=64);const d=Date.parse(c.httpDate);requireValue(Number.isFinite(d)&&new Date(d).toUTCString()===c.httpDate&&BigInt(d)*1000n<=received&&evaluated-BigInt(d)*1000n<=60000000n);}
  const root=strictJson(c.text);requireValue(data(root,['jsonrpc','id','result'])&&root.jsonrpc==='2.0'&&root.id===c.id&&data(root.result,['context','value'])&&data(root.result.context,['slot'],['apiVersion'])&&Number.isSafeInteger(root.result.context.slot)&&Number(root.result.context.slot)>0);
  if(root.result.context.apiVersion!==undefined)requireValue(typeof root.result.context.apiVersion==='string'&&/^[0-9A-Za-z.+-]{1,32}$/.test(root.result.context.apiVersion));
  const v=root.result.value;requireValue(data(v,['data','owner','executable','lamports','rentEpoch'],['space'])&&v.executable===false&&typeof v.owner==='string'&&typeof v.lamports==='number'&&Number.isInteger(v.lamports)&&v.lamports>=0&&typeof v.rentEpoch==='number'&&Number.isInteger(v.rentEpoch)&&v.rentEpoch>=0);
  let controls:Controls,accountHash:string|null=null;
  if(c.encoding==='base64'){
   requireValue(Array.isArray(v.data)&&v.data.length===2&&v.data[1]==='base64');const b=strictBase64(v.data[0]);if(v.space!==undefined)requireValue(v.space===b.length);
   controls=decodeMintBytes(b,v.owner);accountHash=createHash('sha256').update(b).digest('hex');
  }else{
   // All caller primitives snapshotted above BEFORE this existing decoder's asynchronous hashing.
   const decoded=await decodeResponse({mint:c.mint,requestId:c.id,text:c.text,requestStartedAt:c.requestStartedAt,responseReceivedAt:c.receivedAt,evaluatedAt:c.evaluatedAt,httpDate:c.httpDate,acquisition:c.kind,endpointHost:c.endpointHost});
   requireValue(decoded.facts&&decoded.source);const f=decoded.facts;
   const complete=f.extensions.assessment!=='unreviewed';
   controls={program:f.program,ownerProgram:f.ownerProgram,initialized:true,decimals:f.supply.decimals,rawSupply:f.supply.raw,mintAuthority:f.mintAuthority.address,freezeAuthority:f.freezeAuthority.address,
    permanentDelegate:null,transferHook:null,transferFee:null,defaultAccountState:null,nonTransferable:false,pausable:null,mintCloseAuthority:null,
    extensionTypes:[],unsupported:complete?[]:[65535],extensionCoverage:complete?'complete_reviewed':'incomplete_or_unsupported'};
  }
  const source:Provenance={kind:c.kind,network:'solana-mainnet',endpointHost:c.endpointHost,method:'getAccountInfo',encoding:c.encoding,account:mint,commitment:'finalized',contextSlot:String(root.result.context.slot),requestStartedAt:c.requestStartedAt,receivedAt:c.receivedAt,evaluatedAt:c.evaluatedAt,httpDate:c.httpDate,
   responseSha256:createHash('sha256').update(Buffer.from(c.text,'utf8')).digest('hex'),accountDataSha256:accountHash,assurance:'captured_rpc_report_not_independently_replayed',providerAuthenticated:false,identityBinding:'captured_request_not_echoed_by_account_response',decoder:'oracle-onchain/1',maxAccountBytes:8192};
  return seal({mint,controls,source,reason:null});
 }catch{return seal({mint,controls:null,source:null,reason:'missing_stale_unsupported_or_malformed_capture'});}
}
