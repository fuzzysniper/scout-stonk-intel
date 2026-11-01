import type {RiskFinding} from '../../lib/v4-owner-preview/view-contract';
import {isExactPublicKey} from '../../lib/onchain-mint/validation';
import {availableFindings,isLensResponse,type LensView} from './intelligence-model';
import {decisionBrief} from './decision-brief';
import {observedMintFor} from './oracle-evidence';

export const CLAIMS=[
 {id:'mint-authority',label:'Mint authority is revoked.'},
 {id:'freeze-authority',label:'Freeze authority is revoked.'},
 {id:'organic',label:'Activity establishes organic demand.'}
]as const;
export type ClaimId=typeof CLAIMS[number]['id'];
export type ClaimOutcome='SUPPORTED WITHIN SCOPE'|'CONTRADICTED'|'REPORTED ONLY'|'NOT ESTABLISHED';
export type ClaimReference=Readonly<{finding:RiskFinding;receivedAt:string|null;current:boolean}>;
const LIFETIME=60000;
const stamp=(s:string|null|undefined)=>s&&Number.isFinite(Date.parse(s))?Date.parse(s):null;
const sourceFacts=(view:LensView)=>[...view.facts,...view.controls,...Object.values(view.windows).flat()];
/** Receipt lookup only; never substitutes receipt time for a provider's update clock. */
function receipt(view:LensView,f:RiskFinding):string|null{
 const n=observedMintFor(view.oracleEvidence,f);if(n)return n.receivedAt;
 const times=[...new Set(sourceFacts(view).filter(x=>x.responseSha256===f.responseSha256&&x.observedAt===f.observedAt&&x.receivedAt).map(x=>x.receivedAt!))];
 return times.length===1?times[0]:null;
}
function expiry(view:LensView,f:RiskFinding,now:number,test:boolean):number|null{
 const at=stamp(f.observedAt),received=stamp(receipt(view,f));
 if(view.state==='sources_off'||view.state==='unavailable'||f.tone==='gray'||!f.responseSha256||!f.fieldPath||at===null||at>now||now>=at+LIFETIME)return null;
 if(f.id.startsWith('onchain-')){
  const n=observedMintFor(view.oracleEvidence,f);
  if(!n&&!test)return null;
  if(n&&(stamp(n.evaluatedAt)===null||Date.parse(n.evaluatedAt)>now))return null;
 }else if(received===null||received<at||received>now||!sourceFacts(view).some(x=>x.responseSha256===f.responseSha256&&x.observedAt===f.observedAt&&x.status==='reported')||sourceFacts(view).some(x=>x.responseSha256===f.responseSha256&&x.status==='stale'))return null;
 return at+LIFETIME;
}
function nativePermission(f:RiskFinding|undefined,kind:Exclude<ClaimId,'organic'>):boolean|null{
 const path=kind==='mint-authority'?'result.value.data[0]#bytes[0:36]':'result.value.data[0]#bytes[46:82]';
 if(!f||f.fieldPath!==path)return null;
 return f.tone==='green'&&f.value==='Base authority null'?true:f.tone==='red'&&isExactPublicKey(f.value)?false:null;
}
function providerPermission(f:RiskFinding|undefined,kind:Exclude<ClaimId,'organic'>):boolean|null{
 if(!f||!f.source?.startsWith('Jupiter Tokens V2')||f.fieldPath!=='audit.'+(kind==='mint-authority'?'mintAuthorityDisabled':'freezeAuthorityDisabled'))return null;
 return f.tone==='green'&&f.value==='Disabled (reported)'?true:f.tone==='red'&&f.value==='Not disabled (reported)'?false:null;
}
/** Deterministic reading of already-sanitized findings. No acquisition, scoring or evidence creation.
 * A fixture may demonstrate the rules only inside its explicit TEST scope, never as a live observation.
 */
export function testClaim(view:LensView,id:ClaimId,now=Date.now()){
 const test=decisionBrief(view).test;
 const all=isLensResponse(view,view.mint)?availableFindings(view):[];
 const ids=id==='organic'?['organic','retention','farming-cohorts']:['onchain-'+id,id,'onchain-jupiter-contradiction'];
 const candidates=ids.map(key=>all.find(f=>f.id===key)).filter((f):f is RiskFinding=>!!f);
 // Cite the actual permission reports; empty independent checks stay in the24-card readout.
 const refs=id==='organic'?candidates:candidates.some(f=>f.tone!=='gray')?candidates.filter(f=>f.tone!=='gray'||f.value==='Reports differ'):candidates.filter(f=>f.id!=='onchain-jupiter-contradiction');
 const deadlines=refs.map(f=>expiry(view,f,now,test));
 const references:readonly ClaimReference[]=refs.map((finding,i)=>({finding,receivedAt:receipt(view,finding),current:deadlines[i]!==null}));
 const live=deadlines.filter((x):x is number=>x!==null);
 const base={test,references,validUntil:live.length?Math.min(...live):null};
 const result=(outcome:ClaimOutcome,reason:string,scope:string)=>({...base,outcome,reason,scope});
 const limit='Only the captured base permission and its source clock. This does not establish a revocation event, other controls, intent or token safety.';
 if(id==='organic')return result('NOT ESTABLISHED','Activity counts and a provider score do not establish organic demand. Wallet-level participation and returning demand remain unproven.','No organic-demand conclusion follows from these returned findings, even when an activity score is green.');
 const native=refs.find(f=>f.id==='onchain-'+id),provider=refs.find(f=>f.id===id),comparison=refs.find(f=>f.id==='onchain-jupiter-contradiction');
 const n=nativePermission(native,id),p=providerPermission(provider,id);
 const qualifiedNative=!!native&&(test||!!observedMintFor(view.oracleEvidence,native));
 // Keep unresolved disagreement visible even as one report ages; expiry cannot turn conflict into support.
 if(qualifiedNative&&n!==null&&p!==null&&n!==p||comparison?.value==='Reports differ')return result('NOT ESTABLISHED','Returned source reports differ. Their clocks are not aligned; reconcile both references before relying on the claim.',limit);
 const current=(f:RiskFinding|undefined)=>!!f&&references.some(r=>r.finding===f&&r.current);
 if(qualifiedNative&&n!==null&&current(native))return result(n?'SUPPORTED WITHIN SCOPE':'CONTRADICTED',n?'The base permission is absent at the captured context; how or when it became absent is not established.':'The base permission is present at the captured context. Presence is not proof of malicious intent.',limit);
 if(p!==null&&current(provider))return result('REPORTED ONLY',p?'Jupiter reports this base permission disabled. Independent account state and a revocation event are unverified.':'Jupiter reports this base permission not disabled. The report does not support the claim; independent account state and intent remain unverified.',limit);
 return result('NOT ESTABLISHED','No current, sufficiently scoped permission finding supports a conclusion. Missing, expired or unsupported evidence is not a contradiction.',limit);
}
