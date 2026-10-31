import 'server-only';
import {freeze,isExactPublicKey,utcMicros} from '../../onchain-mint/validation';
import {data} from '../../v4-helius-pilot/server/profile';
import {nanos} from '../../v4-ca-intelligence/market';
import {projectOnchainRisk} from '../onchain/project';
import type {RiskFinding} from '../../v4-owner-preview/view-contract';
import type {JupiterReport,NativeMintObservation} from './contract';
import {inspectNativeObservation} from './producer';
/** Server projection from an admitted producer capability, NOT an offline/caller capture.
 * No Fetch, provider, SQL, key read or acquisition. TTL/STOP/qualification are checked before disclosure.
 */
export function projectNativeMintRisk(input:Readonly<{mint:unknown;evaluatedAt:string;observation?:NativeMintObservation|null;jupiter?:JupiterReport|null}>):readonly RiskFinding[]{
 const blank=()=>projectOnchainRisk({mint:null,evaluatedAt:'',onchain:null});
 try{
  if(!data(input,['mint','evaluatedAt'],['observation','jupiter'])||!isExactPublicKey(input.mint))return blank();
  const view=inspectNativeObservation(input.observation),at=utcMicros(input.evaluatedAt);
  if(!view||at===null)return blank();const {controls:c,source:s}=view,received=utcMicros(s.receivedAt),evaluated=utcMicros(s.evaluatedAt);
  if(s.account!==input.mint||received===null||evaluated===null||at<evaluated||at-received>60000000n||at>BigInt(Date.now()+1000)*1000n)return blank();
  const out=blank().map(f=>({...f})),complete=c.extensionCoverage==='complete_reviewed',fixture=s.acquisition==='synthetic_fixture';
  const context='Acct '+s.account+'; request '+s.requestStartedAt+'; receipt '+s.receivedAt+'; bytes SHA256 '+s.accountDataSha256+'; request SHA256 '+s.requestSha256+'. Decoder oracle-onchain/1:8192B account/65536B RPC/32 TLVs. '+(fixture?'LOCAL TLS SYNTHETIC, not Helius authenticated. ':'Fixed-host TLS; server-owned finalized request. ')+'Slot is RPC context, not block/change time. RPC report, not independent chain replay or safety certification.';
  const put=(id:string,tone:RiskFinding['tone'],value:string|null,explanation:string,path:string)=>{
   const i=out.findIndex(f=>f.id==='onchain-'+id);if(i<0)return;const text=explanation+' '+context;if(text.length>1000)throw Error('finding_limit');
   out[i]={...out[i],tone,title:(fixture?'[SYNTHETIC] ':'')+out[i].title,value,explanation:text,fieldPath:path,
    source:(fixture?'SYNTHETIC LOCAL TLS':'SOLANA RPC OBSERVED')+' mainnet.helius-rpc.com base64 finalized slot '+s.contextSlot,
    observedAt:s.receivedAt,responseSha256:s.responseSha256};
  };
  put('mint-identity','green',c.program+'; '+c.rawSupply+' raw; decimals '+c.decimals,'Initialized supported mint account and raw supply/decimals. Issuer, backing, UI-scaled balances and safety are not established.','result.value.owner; result.value.data[0]#Mint82');
  for(const [id,address]of [['mint-authority',c.mintAuthority],['freeze-authority',c.freezeAuthority]]as const)
   put(id,address?'red':complete?'green':'gray',address??'Base authority null',address?(id==='mint-authority'?'Permission to issue tokens is present.':'Permission to freeze token accounts is present.')+' Actual signer/PDA/multisig control is unknown.':complete?'Only this base permission is absent at the reported context. Other controls, frozen accounts and risks remain separate.':'Base permission null; unsupported controls block an absence clearance.',id==='mint-authority'?'result.value.data[0]#bytes[0:36]':'result.value.data[0]#bytes[46:82]');
  put('permanent-delegate',c.permanentDelegate?'red':complete?'green':'gray',c.permanentDelegate??(complete?'No delegate configured':null),c.permanentDelegate?'Permanent delegate has transfer/burn permission over holder accounts. Signer control and other transfer constraints are unknown.':complete?'No permanent delegate in the reviewed captured layout; no overall safety conclusion.':'Unknown/unreviewed extension coverage prevents a delegate-absence conclusion.','result.value.data[0]#TLV(type=12)');
  const h=c.transferHook;
  put('transfer-hook',h?.programId||h?.authority?'yellow':complete?'green':'gray',h?.programId??(h?.authority?'No hook set; mutable':complete?'No hook configured':null),h?.programId?'Custom transfer program '+h.programId+'; update authority '+(h.authority??'null')+'. Program semantics/upgrades/extra accounts and exit compatibility unknown.':h?.authority?'Authority '+h.authority+' may configure a hook later.':complete?'No configured transfer hook in the captured reviewed layout. Other risks remain separate.':'Unsupported extensions prevent hook-absence clearance.','result.value.data[0]#TLV(type=14)');
  const f=c.transferFee,risk=f&&(f.configAuthority||f.withdrawWithheldAuthority||f.older.basisPoints||f.newer.basisPoints||f.withheldRaw!=='0');
  put('transfer-fees',risk?'yellow':complete?'green':'gray',f?f.older.basisPoints+'/'+f.newer.basisPoints+' bps schedules':complete?'No transfer fee configured':null,f?'Older epoch '+f.older.epoch+': '+f.older.basisPoints+'bps cap '+f.older.maximumFeeRaw+'raw; newer '+f.newer.epoch+': '+f.newer.basisPoints+'bps cap '+f.newer.maximumFeeRaw+'raw. Active epoch/rate unknown. Config '+(f.configAuthority??'null')+'; withheld withdrawal '+(f.withdrawWithheldAuthority??'null')+' ('+f.withheldRaw+'raw). Fee custody is NOT LP custody or ROI.':complete?'No transfer-fee config in reviewed captured layout; not a sell quote.':'Fee coverage incomplete; no zero-tax claim.','result.value.data[0]#TLV(type=1)');
  const blocked=c.nonTransferable||c.defaultAccountState==='frozen'||c.pausable?.paused,mutable=!!c.pausable?.authority||!!c.mintCloseAuthority;
  put('transfer-restrictions',blocked?'red':!complete?'gray':mutable?'yellow':'green',blocked?'Transfer restriction reported':!complete?'Unreviewed extensions':mutable?'Additional authority present':'No checked restriction','Non-transferable '+c.nonTransferable+'; default '+(c.defaultAccountState??'standard')+'; paused '+(c.pausable?.paused??false)+', pause authority '+(c.pausable?.authority??'null')+'; mint-close '+(c.mintCloseAuthority??'null')+' (requires zero supply). Unsupported IDs '+(c.unsupported.join(',')||'none')+'. Per-account freeze/allowance/route and program upgrades unknown.','result.value.data[0]#TLV');
  const j=input.jupiter;
  if(data(j,['mint','sourceUpdatedAt','receivedAt','responseSha256'],['mintAuthorityDisabled','freezeAuthorityDisabled','tokenProgram','decimals'])&&j.mint===input.mint
   &&typeof j.responseSha256==='string'&&/^[a-f0-9]{64}$/.test(j.responseSha256)){
   const updated=nanos(j.sourceUpdatedAt),receipt=nanos(j.receivedAt),names=['mintAuthorityDisabled','freezeAuthorityDisabled','tokenProgram','decimals'] as const;
   const types=names.slice(0,2).every(k=>j[k]===undefined||typeof j[k]==='boolean')&&(j.tokenProgram===undefined||isExactPublicKey(j.tokenProgram))&&(j.decimals===undefined||Number.isInteger(j.decimals)&&Number(j.decimals)>=0&&Number(j.decimals)<=255);
   if(types&&names.some(k=>j[k]!==undefined)&&updated!==null&&receipt!==null&&updated<=receipt&&receipt<=at*1000n&&at*1000n-updated<=60000000000n){
    const different=j.mintAuthorityDisabled!==undefined&&j.mintAuthorityDisabled!==(c.mintAuthority===null)||j.freezeAuthorityDisabled!==undefined&&j.freezeAuthorityDisabled!==(c.freezeAuthority===null)||j.tokenProgram!==undefined&&j.tokenProgram!==c.ownerProgram||j.decimals!==undefined&&j.decimals!==c.decimals;
    put('jupiter-contradiction','gray',different?'Reports differ':'No compared difference','Jupiter record '+j.sourceUpdatedAt+', receipt '+j.receivedAt+', SHA '+j.responseSha256+'. '+(different?'Reported controls differ.':'Supplied compared fields agree.')+' No aligned authority observation slot; change/aggregation possible. Neither source replaces the other.','rpc.base <> jupiter.audit');
   }
  }
  return freeze(out);
 }catch{return blank();}
}
