import type {FactView,RiskFinding} from '../../lib/v4-owner-preview/view-contract';
import {availableFindings,isLensResponse,prioritize,type LensView} from './intelligence-model';
import {briefFindingTitle,decisionBrief} from './decision-brief';
import {testClaim,type ClaimReference} from './claim-check';
import {observedMintFor} from './oracle-evidence';

export type TakeReference=Readonly<{kind:'finding';reference:ClaimReference;expiresAt:number|null}>|Readonly<{kind:'fact';fact:FactView;current:boolean;expiresAt:number|null}>;
export type TakePart=Readonly<{text:string;tone:RiskFinding['tone'];references:readonly TakeReference[]}>;
const stamp=(s:string|null)=>s&&Number.isFinite(Date.parse(s))?Date.parse(s):null;
const sourceFacts=(v:LensView)=>[...v.facts,...v.controls,...Object.values(v.windows).flat()];
const hash=(s:string|null)=>!!s&&/^[a-f0-9]{64}$/.test(s);
/** Provider record clock and matching receipt remain separate; no metric cutoff is inferred. */
function currentFact(f:FactView,now:number,test:boolean){
 const at=stamp(f.observedAt),received=stamp(f.receivedAt);
 return f.status==='reported'&&f.value!==null&&!!f.path&&hash(f.responseSha256)&&!!f.source?.startsWith('Jupiter Tokens V2')
  &&(f.captureKind==='native_https'||test&&(f.captureKind==='synthetic_fixture'||f.captureKind==='recorded_response'))
  &&at!==null&&received!==null&&at<=received&&received<=now&&now<at+60000;
}
/** Display-only deterministic thesis over the already sanitized result. No acquisition or prediction. */
export function oracleTake(view:LensView,now=Date.now(),withheld=false){
 const brief=decisionBrief(view),valid=isLensResponse(view,view.mint),usable=valid&&!['sources_off','unavailable'].includes(view.state)&&!withheld;
 const claims=valid?(['mint-authority','freeze-authority']as const).map(id=>testClaim(view,id,now)):[];
 const factRef=(fact:FactView):TakeReference=>{const current=usable&&currentFact(fact,now,brief.test);return {kind:'fact',fact,current,expiresAt:current?Date.parse(fact.observedAt!)+60000:null};};
 const findingRef=(finding:RiskFinding):TakeReference=>{
  const known=claims.flatMap(c=>c.references).find(r=>r.finding===finding),native=observedMintFor(view.oracleEvidence,finding),at=stamp(finding.observedAt);
  const matches=sourceFacts(view).filter(f=>f.responseSha256===finding.responseSha256&&f.observedAt===finding.observedAt),clocks=[...new Set(matches.map(f=>f.receivedAt).filter((s):s is string=>s!==null))];
  const receivedAt=native?.receivedAt??known?.receivedAt??(clocks.length===1?clocks[0]:null);
  const nativeCurrent=!!native&&Date.parse(native.evaluatedAt)<=now||brief.test&&/synthetic|replay/i.test((finding.source??'')+' '+finding.title);
  const providerCurrent=!!finding.source?.startsWith('Jupiter Tokens V2')&&clocks.length===1&&matches.some(f=>currentFact(f,now,brief.test))&&!matches.some(f=>f.status==='stale');
  const current=usable&&finding.tone!=='gray'&&!!finding.fieldPath&&hash(finding.responseSha256)&&at!==null&&at<=now&&now<at+60000
   &&(known?known.current:finding.id.startsWith('onchain-')?nativeCurrent:providerCurrent);
  return {kind:'finding',reference:{finding,receivedAt,current},expiresAt:current?at!+60000:null};
 };
 const findings=valid?prioritize(availableFindings(view)):[],refs=findings.map(findingRef);
 const current=(r:TakeReference)=>r.kind==='fact'?r.current:r.reference.current;
 const byId=(id:string)=>refs.find(r=>r.kind==='finding'&&r.reference.finding.id===id);
 const primary=brief.primary?byId(brief.primary.id):undefined;
 const part=(text:string,tone:TakePart['tone'],references:readonly (TakeReference|undefined)[]=[]):TakePart=>({text,tone,references:references.filter((r):r is TakeReference=>!!r)});
 const unknown=part(brief.primary?['onchain-mint-identity','ui-rug-unavailable'].includes(brief.primary.id)?'Token identity and base permissions remain unverified.':briefFindingTitle(brief.primary):'Independent coverage remains unproven.','gray',[primary]);
 const red=refs.find(r=>r.kind==='finding'&&r.reference.finding.tone==='red'&&current(r));
 const oldRed=refs.find(r=>r.kind==='finding'&&r.reference.finding.tone==='red'&&!current(r));
 // Reuse #273's exact conflict decision and citations rather than inventing a source reconciliation.
 const conflict=claims.find(c=>c.reason.startsWith('Returned source reports differ.'));
 let activity:TakeReference|undefined,historicalActivity:TakeReference|undefined,period:string|undefined;
 for(const p of ['1h','5m','24h']as const){const f=view.windows[p].find(f=>f.id===p+'-buys'&&f.unit==='transactions'&&f.path==='stats'+p+'.numBuys'&&/^[1-9]\d*$/.test(f.value??''));if(f){const r=factRef(f);historicalActivity??=r;if(current(r)){activity=r;period=p;break;}}}
 const markets=view.facts.filter(f=>['priceUsd','mcapUsd','fdvUsd','liquidityUsd'].includes(f.id)).map(factRef),market=markets.find(current);
 const permission=claims.find(c=>c.outcome==='SUPPORTED WITHIN SCOPE'&&c.references.some(r=>r.current&&r.finding.id.startsWith('onchain-')));
 const permissionRef=permission?.references.find(r=>r.current&&r.finding.id.startsWith('onchain-'));
 const snapshot=permissionRef?byId(permissionRef.finding.id):undefined;
 // History stays in the same canonical view only; it is never retained past Clear or native overlay removal.
 const history=oldRed??historicalActivity??refs.find(r=>r.kind==='finding'&&r.reference.finding.id==='onchain-mint-authority'&&r.reference.finding.value==='Base authority null')??markets.find(r=>r.kind==='fact'&&r.fact.value!==null);
 let take=part('No defensible thesis established.','gray',[history]),why=part('Not established: no current activity evidence.','gray',[history??byId('organic')]),breaks=part('A thesis needs a current, sufficiently scoped source receipt.','gray',[history??primary]);
 if(withheld){breaks=part('Thesis withdrawn after STOP; see the owner control for its outcome.','gray',[history??primary]);}
 else if(usable&&(red||activity||market||snapshot)){
  if(conflict){const evidence=conflict.references.map(r=>byId(r.finding.id));take=part('Control evidence needs reconciliation; no defensible thesis is established.',red?'red':'gray',evidence);breaks=part('Resolve the conflicting reports and their different clocks first.',red?'red':'gray',evidence);why=part('Not established while control reports remain unresolved.','gray',evidence);}
  else if(red&&red.kind==='finding'){const f=red.reference.finding,source=f.id.startsWith('onchain-')?(brief.test?'TEST snapshot':'RPC-reported'):'Jupiter-reported';take=part('A '+source+' warning takes priority; the growth thesis is unresolved.','red',[red]);breaks=part(briefFindingTitle(f)+' needs review; this is not proof of intent.','red',[red]);why=part('Not established while the warning remains unresolved.','gray',[red]);}
  else if(oldRed){take=part('A warning lacks current source qualification; no defensible thesis is established.','gray',[oldRed]);breaks=part('Obtain a current, qualified receipt for the returned warning.','gray',[oldRed]);why=part('Not established while the warning lacks current source qualification.','gray',[oldRed]);}
  else if(activity){take=part('The continuation thesis rests on Jupiter-reported activity; retention is unproven.','yellow',[activity]);why=part('Hypothesis only: Jupiter-reported '+period+' buys could continue; organic demand is unverified.','yellow',[activity,byId('retention')]);breaks=part('An expired or conflicting activity receipt withdraws this hypothesis.','gray',[activity]);}
  else if(snapshot){take=part('One base permission is absent in a snapshot; a momentum thesis is unestablished.','gray',[snapshot]);why=part('Not established: permission absence does not establish demand.','gray',[snapshot]);breaks=part('Expiry or a conflicting receipt withdraws this snapshot reading.','gray',[snapshot]);}
  else {take=part('Jupiter market facts alone do not establish a demand thesis.','gray',[market]);why=part('Not established: a market price or liquidity total does not prove demand.','gray',[market]);breaks=part('A continuation hypothesis needs current transaction evidence.','gray',[market]);}
 }
 const parts={take,breaks,why,unknown};
 const used=Object.values(parts).flatMap(p=>p.references),deadlines=used.map(r=>r.expiresAt).filter((x):x is number=>x!==null);
 const lead=take.references.find(current),f=lead?.kind==='fact'?lead.fact:lead?.kind==='finding'?lead.reference.finding:undefined;
 const receivedAt=lead?.kind==='fact'?lead.fact.receivedAt:lead?.kind==='finding'?lead.reference.receivedAt:null;
 return {...parts,test:brief.test,withheld,validUntil:deadlines.length?Math.min(...deadlines):null,freshness:f?{native:f.id.startsWith('onchain-'),observedAt:f.observedAt,receivedAt}:null,sourceOff:view.state==='sources_off'};
}
