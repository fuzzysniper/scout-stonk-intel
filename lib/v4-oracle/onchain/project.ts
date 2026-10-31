import {freeze,isExactPublicKey,utcMicros} from '../../onchain-mint/validation';
import {data} from '../../v4-helius-pilot/server/profile';
import {nanos} from '../../v4-ca-intelligence/market';
import type {RiskFinding} from '../../v4-owner-preview/view-contract';
import type {RiskInput,Provenance,JupiterReport} from './contract';
import {inspectEvidence} from './evidence';
const FIELDS=[
 ['mint-identity','Mint identity','An initialized supported mint account, program and decimals have not been observed.'],
 ['mint-authority','Mint authority','Base mint authority has not been independently observed.'],
 ['freeze-authority','Freeze authority','Base freeze authority has not been independently observed.'],
 ['permanent-delegate','Permanent delegate','Permanent delegate state has not been observed.'],
 ['transfer-hook','Transfer hook','Transfer hook program and update authority are unknown.'],
 ['transfer-fees','Transfer fees','Fee schedules, epoch applicability and authorities have not been checked.'],
 ['transfer-restrictions','Other transfer controls','Default frozen state, pause, non-transferability and unsupported extensions have not been checked.'],
 ['lp-custody','LP withdrawal custody','Current pool identity, LP mint/position ownership, lock terms and withdrawal authority are not proven. Jupiter total liquidity is not custody evidence.'],
 ['exit-route','Executable exit','No exact input amount, quote mint, pool route, quote age/expiry or transfer compatibility has been checked. A price or route quote is not guaranteed sellability.'],
 ['jupiter-contradiction','Cross-source consistency','No comparable Jupiter/onchain control observations are available. Provider audit flags are not independently observed facts.']
] as const;
function blank():RiskFinding[]{return FIELDS.map(([id,title,explanation])=>({id:'onchain-'+id,pillar:'rug',tone:'gray',title,value:null,explanation,fieldPath:null,source:null,observedAt:null,responseSha256:null}));}
function provenance(s:Provenance):string {
 return `Acct ${s.account}; request ${s.requestStartedAt}; receipt ${s.receivedAt}; RPC SHA256 ${s.responseSha256}${s.accountDataSha256?'; bytes SHA256 '+s.accountDataSha256:''}. Decoder ${s.decoder}: account<=8192B/RPC<=65536B/TLV<=32. Captured request binds account (not echoed); slot is context, not mutation/block time. Origin unauthenticated; not independent replay.`;
}
function report(value:unknown,mint:string,at:bigint):JupiterReport|null {
 if(!data(value,['mint','sourceUpdatedAt','receivedAt','responseSha256'],['mintAuthorityDisabled','freezeAuthorityDisabled','tokenProgram','decimals'])||value.mint!==mint||typeof value.responseSha256!=='string'||!/^([a-f0-9]{64})$/.test(value.responseSha256))return null;
 const updated=nanos(value.sourceUpdatedAt),received=nanos(value.receivedAt),evaluated=at*1000n;if(updated===null||received===null||updated>received||received>evaluated||evaluated-updated>60000000000n)return null;
 for(const f of ['mintAuthorityDisabled','freezeAuthorityDisabled'])if(value[f]!==undefined&&typeof value[f]!=='boolean')return null;
 if(value.tokenProgram!==undefined&&!isExactPublicKey(value.tokenProgram)||value.decimals!==undefined&&(!Number.isInteger(value.decimals)||Number(value.decimals)<0||Number(value.decimals)>255))return null;
 return Object.freeze({...value}) as JupiterReport;
}
/** Pure, synchronous read-only classifier over sealed decoded captures. Never calls a provider or authenticates a supplied capture.
 * Every offline/replay finding is unmissably labelled; native inputs are not accepted by the offline constructor.
 */
export function projectOnchainRisk(input:RiskInput):readonly RiskFinding[]{
 const out=blank();
 try{
  if(!data(input,['mint','evaluatedAt'],['onchain','jupiter'])||!isExactPublicKey(input.mint))return freeze(out);
  const evaluated=utcMicros(input.evaluatedAt),e=inspectEvidence(input.onchain);if(evaluated===null||!e?.controls||!e.source||e.mint!==input.mint)return freeze(out);
  const s=e.source,received=utcMicros(s.receivedAt),original=utcMicros(s.evaluatedAt);
  if(received===null||original===null||evaluated<original||evaluated-received>60000000n)return freeze(out);
  const c=e.controls,prefix=s.kind==='synthetic_fixture'?'[SYNTHETIC] ':'[REPLAY] ',evidence=provenance(s),complete=c.extensionCoverage==='complete_reviewed';
  const put=(id:string,tone:RiskFinding['tone'],value:string|null,why:string,path:string)=>{
   const i=out.findIndex(f=>f.id==='onchain-'+id);if(i<0)return;
   const explanation=why+' '+evidence;
   if(explanation.length>1000)throw Error('finding_overflow');
   out[i]={...out[i],tone,title:prefix+out[i].title,value,explanation,fieldPath:path,source:`${s.kind==='synthetic_fixture'?'SYNTHETIC OFFLINE':'REPLAY/origin-unverified'} ${s.endpointHost} getAccountInfo/${s.encoding} finalized slot ${s.contextSlot}`,observedAt:s.receivedAt,responseSha256:s.responseSha256};
  };
  put('mint-identity','green',`${c.program}; decimals ${c.decimals}`,`Initialized supported mint layout; raw supply ${c.rawSupply}, decimals ${c.decimals}. This verifies captured structure, not issuer, backing, UI-scaled balance or safety.`, 'result.value.owner; result.value.data (mint base)');
  for(const [id,address]of [['mint-authority',c.mintAuthority],['freeze-authority',c.freezeAuthority]] as const){
   put(id,address?'red':complete?'green':'gray',address??'Base authority null',address?(id==='mint-authority'?'Base authority can issue tokens under the mint permission.':'Base authority can freeze token accounts under this permission.')+' Signer control/PDA/multisig ownership is unknown.':complete?'Only this base authority is absent in the captured account. Other findings and risks remain separate.':'Base authority is null, but unsupported transfer/supply controls block an absence-based clearance.', s.encoding==='base64'?(id==='mint-authority'?'result.value.data[0]#bytes[0:36]':'result.value.data[0]#bytes[46:82]'):'result.value.data.parsed.info.'+(id==='mint-authority'?'mintAuthority':'freezeAuthority'));
  }
  put('permanent-delegate',c.permanentDelegate?'red':complete?'green':'gray',c.permanentDelegate??(complete?'No delegate configured':null),c.permanentDelegate?'A permanent delegate can transfer or burn holder tokens without their ordinary authority; actual signer control is unknown.':complete?'No permanent delegate was configured in this captured layout. This is not overall safety.':'Unknown/unreviewed extension coverage prevents a delegate-absence conclusion.',s.encoding==='base64'?'result.value.data[0]#TLV(type=12)':'result.value.data.parsed.info.extensions');
  const h=c.transferHook;
  put('transfer-hook',h?.programId||h?.authority?'yellow':complete?'green':'gray',h?.programId??(h?.authority?'No hook set; mutable':complete?'No hook configured':null),h?.programId?`Custom program ${h.programId} participates in transfers; semantics/upgrades/required accounts and sell compatibility are unknown. Update authority ${h.authority??'null'}.`:h?.authority?`Authority ${h.authority} can configure a hook later; absence of a current hook is not immutable clearance.`:complete?'No configured transfer hook is present in this captured layout. Other transfer risks remain separate.':'Unsupported extensions prevent transfer-hook absence clearance.',s.encoding==='base64'?'result.value.data[0]#TLV(type=14)':'result.value.data.parsed.info.extensions');
  const f=c.transferFee;
  const feeRisk=f&&(f.configAuthority||f.withdrawWithheldAuthority||f.older.basisPoints||f.newer.basisPoints||f.withheldRaw!=='0');
  put('transfer-fees',feeRisk?'yellow':complete?'green':'gray',f?`${f.older.basisPoints}/${f.newer.basisPoints} bps schedules`:complete?'No transfer fee configured':null,f?`Older epoch ${f.older.epoch}: ${f.older.basisPoints}bps cap ${f.older.maximumFeeRaw}raw; newer epoch ${f.newer.epoch}: ${f.newer.basisPoints}bps cap ${f.newer.maximumFeeRaw}raw. Active epoch/rate unknown. Config ${f.configAuthority??'null'}; withheld-fee withdrawal ${f.withdrawWithheldAuthority??'null'} (${f.withheldRaw}raw held). This is fee custody, NOT LP withdrawal or holder ROI.`:complete?'No transfer-fee configuration was found in the complete captured layout. This is not a sell quote.':'Fee schedule coverage is incomplete; no zero-tax claim.',s.encoding==='base64'?'result.value.data[0]#TLV(type=1)':'result.value.data.parsed.info.extensions');
  const blocked=c.nonTransferable||c.defaultAccountState==='frozen'||c.pausable?.paused;
  const mutable=!!c.pausable?.authority||!!c.mintCloseAuthority;
  put('transfer-restrictions',blocked?'red':!complete?'gray':mutable?'yellow':'green',blocked?'Transfer restriction reported':!complete?'Unreviewed extensions':mutable?'Additional authority present':'No checked restriction',`Non-transferable ${c.nonTransferable}; default ${c.defaultAccountState??'standard'}; paused ${c.pausable?.paused??false}, pause authority ${c.pausable?.authority??'null'}; mint-close authority ${c.mintCloseAuthority??'null'} (closure requires zero supply). Unsupported IDs ${c.unsupported.join(',')||'none'}. Per-account freeze/allowance/route state and program upgrades are not checked.`,s.encoding==='base64'?'result.value.data[0]#TLV':'result.value.data.parsed.info.extensions');
  // These capabilities require different evidence. Never infer from mint bytes, fees or Jupiter liquidity/LP claims.
  const j=report(input.jupiter,input.mint,evaluated);
  if(j){const mismatch:string[]=[];
   if(j.mintAuthorityDisabled!==undefined&&j.mintAuthorityDisabled!==(c.mintAuthority===null))mismatch.push(`mint disabled=${j.mintAuthorityDisabled} vs RPC ${c.mintAuthority===null}`);
   if(j.freezeAuthorityDisabled!==undefined&&j.freezeAuthorityDisabled!==(c.freezeAuthority===null))mismatch.push(`freeze disabled=${j.freezeAuthorityDisabled} vs RPC ${c.freezeAuthority===null}`);
   if(j.tokenProgram!==undefined&&j.tokenProgram!==c.ownerProgram)mismatch.push('owner program differs');
   if(j.decimals!==undefined&&j.decimals!==c.decimals)mismatch.push('decimals differ');
   put('jupiter-contradiction','gray',mismatch.length?'Reports differ':'No compared difference',`${mismatch.join('; ')||'Compared supplied fields agree, without proving overall consistency.'} Jupiter record ${j.sourceUpdatedAt}, receipt ${j.receivedAt}, SHA ${j.responseSha256}. No aligned authority observation slot/cutoff; differences can reflect change/aggregation. Neither source silently replaces the other.`, 'rpc.base <> jupiter.audit');
  }
  return freeze(out);
 }catch{return freeze(blank());}
}
