import 'server-only';
import {numericJson,decimal} from './decimal';
import type {MarketEvidence,SourceRef} from './contract';

/** Evidence-specific conditions. Not a token safety score or a rug prediction. */
import type {RiskFinding,RiskTone,RiskPillar} from '../v4-owner-preview/view-contract';

const unknown=(id:string,pillar:RiskPillar,title:string,reason:string):RiskFinding=>Object.freeze({
 id,pillar,tone:'gray' as const,title,value:null,explanation:reason,
 fieldPath:null,source:null,observedAt:null,responseSha256:null
});
const UNKNOWN:readonly RiskFinding[]=Object.freeze([
 unknown('mint-authority','rug','Mint authority','Mint authority was not independently verified; no authority conclusion is available.'),
 unknown('freeze-authority','rug','Freeze authority','Freeze authority was not independently verified; no account-freeze conclusion is available.'),
 unknown('lp-control','rug','Liquidity withdrawal control','No current LP custody, lock, or pool withdrawal-rights evidence has been checked.'),
 unknown('concentration','farm','Top-holder concentration','No reliable concentration percentage was returned; wallet clustering is not verified.'),
 unknown('suspicious','farm','Jupiter suspicious flag','No positive suspicious flag was observed; absence of a flag is not clearance.'),
 unknown('wallet-links','farm','Related insider wallets','Funding links, common control, and coordinated selling have not been investigated.'),
 unknown('organic','momentum','Organic activity','No valid Jupiter Organic Score label was returned.'),
 unknown('verification','momentum','Jupiter verification','Jupiter verification is not reported. Verification alone cannot establish safety.'),
 unknown('retention','momentum','Buyer retention','We do not have historical buyer cohorts or returning-wallet evidence.')
]);
export const unknownRiskFindings=()=>UNKNOWN.map(x=>({...x}));

function observed(id:string,pillar:RiskPillar,title:string,tone:Exclude<RiskTone,'gray'>,value:string,
 explanation:string,fieldPath:string,source:SourceRef):RiskFinding {
 return Object.freeze({id,pillar,title,tone,value,explanation,fieldPath,
  source:'Jupiter Tokens V2 · provider-reported',
  observedAt:source.sourceUpdatedAt??null,responseSha256:source.responseSha256});
}
const isObj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);

/**
 * Consume the SAME identity-checked, freshness-bounded Jupiter response that
 * already generated MarketEvidence. Inability to establish all prerequisites
 * returns gray findings, never a fabricated positive "audit passed" claim.
 */
export function jupiterRiskFindings(text:string,mint:string,market:MarketEvidence):RiskFinding[]{
 const findings=unknownRiskFindings();
 try{
  if(market.state!=='provider_reported')return findings;
  const source=market.priceUsd.source??market.name.source??market.liquidityUsd.source;
  if(!source||source.provider!=='jupiter_tokens_v2'||source.captureKind!=='native_https'||!source.sourceUpdatedAt)return findings;
  const parsed=numericJson(text);
  if(!Array.isArray(parsed.value)||parsed.value.length!==1||!Array.isArray(parsed.lexemes)||parsed.lexemes.length!==1)return findings;
  const token=parsed.value[0],raw=parsed.lexemes[0];
  if(!isObj(token)||!isObj(raw)||token.id!==mint||raw.id!==mint)return findings;
  const audit=isObj(token.audit)?token.audit:null;
  const rawAudit=isObj(raw.audit)?raw.audit:null;
  const put=(finding:RiskFinding)=>{const i=findings.findIndex(x=>x.id===finding.id);if(i>=0)findings[i]=finding;};
  const flags=[
    {key:'mintAuthorityDisabled',id:'mint-authority',title:'Mint authority',positive:'Jupiter reports mint authority disabled. This narrow supply-control check passed; Token-2022 permissions and RPC state remain unverified.',negative:'Jupiter reports mint authority NOT disabled. Additional token issuance may be possible; verify the actual mint authority on-chain.'},
    {key:'freezeAuthorityDisabled',id:'freeze-authority',title:'Freeze authority',positive:'Jupiter reports freeze authority disabled. This narrow base-token check passed; other extensions remain unchecked.',negative:'Jupiter reports freeze authority NOT disabled. A controlling authority may freeze token accounts; inspect the mint and extensions.'}
  ] as const;
  for(const f of flags){
   const v=audit?.[f.key];
   if(typeof v!=='boolean')continue;
   put(observed(f.id,'rug',f.title,v?'green':'red',v?'Disabled (reported)':'Not disabled (reported)',v?f.positive:f.negative,'audit.'+f.key,source));
  }
  const concentration=rawAudit&&decimal(rawAudit.topHoldersPercentage);
  if(concentration!==null&&concentration!==undefined&&typeof audit?.topHoldersPercentage==='number'&&Number.isFinite(audit.topHoldersPercentage)&&audit.topHoldersPercentage>=0&&audit.topHoldersPercentage<=100){
   const n=audit.topHoldersPercentage;
   const tone:Exclude<RiskTone,'gray'>=n>=50?'red':n>=20?'yellow':'green';
   const description=n>=50?'At least 50% is attributed to top holders by Jupiter, an elevated concentration flag.':n>=20?'At least 20% is attributed to top holders by Jupiter.':'Below the 20% concentration watch level in Jupiter\'s reported data.';
   put(observed('concentration','farm','Top-holder concentration',tone,concentration+'%',description+' Thresholds are UNFARMD screening heuristics, not calibrated rug probabilities. Top-holder composition, related wallets and beneficial control are not verified.','audit.topHoldersPercentage',source));
  }
  if(audit?.isSus===true){
   put(observed('suspicious','farm','Jupiter suspicious flag','red','Flagged', 'Jupiter returned audit.isSus=true. Provider warning only; investigate the underlying evidence before treating intent as established.','audit.isSus',source));
  }
  const label=token.organicScoreLabel;
  const organic=decimal(raw.organicScore);
  if((label==='high'||label==='medium'||label==='low')&&organic!==null&&typeof token.organicScore==='number'&&token.organicScore>=0&&token.organicScore<=100){
   const tone=label==='high'?'green':'yellow';
   put(observed('organic','momentum','Organic activity',tone,
    organic+'/100 · '+label.toUpperCase(),
    'Jupiter relative Organic Score; bots/snipers filtering is provider methodology, not wallet-level proof. High does not certify a community and low does not prove farming.','organicScore, organicScoreLabel',source));
  }
  if(typeof token.isVerified==='boolean'){
   put(observed('verification','momentum','Jupiter verification',token.isVerified?'green':'yellow',
    token.isVerified?'Verified by Jupiter':'Not verified by Jupiter',
    'A Jupiter listing/review label, NOT proof against rug pulls, holder collusion or project misrepresentation.','isVerified',source));
  }
 }catch{ return unknownRiskFindings(); }
 return findings;
}
