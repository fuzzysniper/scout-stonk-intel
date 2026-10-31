import {isInspectView,type InspectView,type RiskFinding} from '../../lib/v4-owner-preview/view-contract';

export const PILLARS = [
  {id:'rug',name:'RUG EXPOSURE',question:'Who can change the rules or remove liquidity?'},
  {id:'farm',name:'FARM EXPOSURE',question:'Who is extracting value from incoming buyers?'},
  {id:'momentum',name:'MOMENTUM QUALITY',question:'What supports genuine, continuing demand?'}
] as const;
export const TONES = ['red','yellow','green','gray'] as const;
export type Pillar = RiskFinding['pillar'];
export type Counts = Record<RiskFinding['tone'],number>;
export function counts(findings:readonly RiskFinding[]):Counts {
  const result:Counts={red:0,yellow:0,green:0,gray:0};
  for(const finding of findings)result[finding.tone]++;
  return result;
}

/** UI admission only: the SAME canonical field validation, with a finite combined A/B/Jupiter limit.
 * Do not truncate a late red finding to the original twelve-item transport limit.
 */
export function isLensResponse(value:unknown,mint:string):value is InspectView {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const v=value as InspectView,findings=v.riskFindings;
  if(findings===undefined)return isInspectView(v,mint);
  if(!Array.isArray(findings)||findings.length>48||findings.some(f=>!f||typeof f!=='object'))return false;
  if(new Set(findings.map(f=>f.id)).size!==findings.length)return false;
  if(!isInspectView({...v,riskFindings:undefined},mint))return false;
  for(let i=0;i<findings.length;i+=12)
    if(!isInspectView({...v,riskFindings:findings.slice(i,i+12)},mint))return false;
  return true;
}

/** Missing output is an explicit unknown, never an invented default measurement. */
export function availableFindings(view:InspectView):readonly RiskFinding[] {
  if(view.riskFindings?.length)return view.riskFindings;
  return [
    {id:'ui-rug-unavailable',pillar:'rug',title:'Token and exit controls unknown',explanation:'This inspection supplied no risk evidence for mint permissions, transfer restrictions, LP custody or an executable exit.'},
    {id:'ui-farm-unavailable',pillar:'farm',title:'Wallet extraction unknown',explanation:'This inspection supplied no holder-account exclusions, funding links or wallet-level selling observations.'},
    {id:'ui-momentum-unavailable',pillar:'momentum',title:'Demand quality unknown',explanation:'This inspection supplied no validated demand-quality evidence or historical buyer cohorts.'}
  ].map(f=>({...f,pillar:f.pillar as Pillar,tone:'gray' as const,value:null,fieldPath:null,source:null,observedAt:null,responseSha256:null}));
}

// Editorial order of individual checks, not a numerical risk score or financial calculation.
const critical = ['contradiction','permanent-delegate','transfer-restrictions','freeze-authority','mint-authority','liquidity-removal','lp-custody','suspicious','concentration'];
const materialUnknown = ['lp-custody','lp-control','exit-route','wallet-links','funding','extraction','cohort','retention','transfer','mint','organic','verification'];
function position(id:string,order:readonly string[]){const i=order.findIndex(key=>id.includes(key));return i<0?order.length:i;}
export function prioritize(findings:readonly RiskFinding[]):RiskFinding[] {
  const rank={red:0,yellow:1,gray:2,green:3};
  return findings.map((finding,index)=>({finding,index})).sort((a,b)=>
    rank[a.finding.tone]-rank[b.finding.tone]
    ||position(a.finding.id,a.finding.tone==='gray'?materialUnknown:critical)-position(b.finding.id,b.finding.tone==='gray'?materialUnknown:critical)
    ||a.index-b.index).map(x=>x.finding);
}

/** Surface a material unanswered question from each category before repeating a category. */
export function leadUnknowns(findings:readonly RiskFinding[]):RiskFinding[] {
  const sorted=prioritize(findings.filter(f=>f.tone==='gray'));
  const first=PILLARS.map(p=>sorted.find(f=>f.pillar===p.id)).filter((f):f is RiskFinding=>!!f);
  for(const f of sorted)if(first.length<3&&!first.some(x=>x.id===f.id))first.push(f);
  return first;
}

export function evidenceKind(f:RiskFinding):string {
  if(f.tone==='gray')return 'Unknown';
  const s=f.source??'';
  if(/fixture|synthetic|replay/i.test(s+' '+f.title))return 'Test or replay evidence';
  if(/provided source record/i.test(s))return 'Derived from provided records';
  if(/derived|estimated|calculated/i.test(s))return 'Derived evidence';
  if(/jupiter/i.test(s))return 'Jupiter reported';
  if(/rpc|onchain|on-chain|solana/i.test(s))return 'RPC reported';
  return s?'Source reported':'Source unavailable';
}

export function nextVerification(f:RiskFinding):string {
  if(/contradiction/.test(f.id))return 'Reconcile the exact mint, account, slot and original source fields before relying on either report.';
  if(/lp|liquidity|exit-route/.test(f.id))return 'Check protocol-specific pool custody and withdrawal rights, then a current executable quote. Aggregate liquidity proves neither.';
  if(/mint-authority|freeze-authority|delegate|transfer|rug-unavailable/.test(f.id))return 'Inspect the exact mint account and all supported token extensions using an admitted independent source.';
  if(/concentration|holder/.test(f.id))return 'Verify the denominator and exclude known pools, vaults and exchanges before interpreting common ownership.';
  if(/wallet|fund|extraction|farm-unavailable/.test(f.id))return 'Inspect complete funding and selling transactions. A shared funder alone does not establish common control.';
  if(/retention|cohort|momentum-unavailable/.test(f.id))return 'Compare complete, source-attributed buyer cohorts across time; transaction counts do not establish returning people.';
  if(/organic/.test(f.id))return 'Check wallet-level participation and returning demand. A provider score is not independent proof against wash trading.';
  if(/suspicious/.test(f.id))return 'Inspect the provider flag and underlying transactions. The flag alone does not establish intent.';
  if(/verification/.test(f.id))return 'Check the underlying permissions and project identity; a listing label is not a safety review.';
  return 'Review the original source, observation window and coverage limits before drawing a conclusion.';
}

export function whyItMatters(f:RiskFinding):string {
  if(/contradiction/.test(f.id))return 'The sources disagree. Neither report should silently override the other.';
  if(/lp|liquidity|exit-route/.test(f.id))return 'Displayed liquidity does not establish who can remove it or whether you can exit.';
  if(/freeze-authority/.test(f.id))return 'A freeze permission can restrict token accounts; other controls still need review.';
  if(/mint-authority/.test(f.id))return 'A mint permission can change supply. Its absence does not establish safety.';
  if(/delegate|transfer/.test(f.id))return 'Additional token controls may affect transfers beyond the base permissions.';
  if(/concentration|holder/.test(f.id))return 'Concentration can affect exposure, but token accounts are not necessarily independent owners.';
  if(/wallet|fund|extract|farm-unavailable/.test(f.id))return 'Wallet-level evidence is needed to distinguish extraction from ordinary trading.';
  if(/retention|cohort|momentum-unavailable/.test(f.id))return 'Activity in one window does not prove that demand persists.';
  if(/organic/.test(f.id))return 'A provider activity score does not prove genuine or lasting demand.';
  if(/suspicious/.test(f.id))return 'A reported warning deserves investigation; it does not prove malicious intent.';
  if(/verification/.test(f.id))return 'A provider listing label says little about holder control or exit risk.';
  return f.tone==='gray'?'Missing evidence is an unresolved question, not a passed check.':'This is one narrow finding, not a verdict on the token.';
}

/** Display-only rounding; original values remain available in the same evidence disclosure. */
export function riskDisplay(f:RiskFinding):string {
  if(f.value===null)return 'Not established';
  if(/^(?:0|[1-9]\d*)(?:\.\d+)?%$/.test(f.value)) {
    const n=Number(f.value.slice(0,-1));
    if(Number.isFinite(n)&&n>=0&&n<=100)return n>0&&n<0.01?'<0.01%':new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n)+'%';
  }
  const m=/^(\d+(?:\.\d+)?)\/100 · (HIGH|MEDIUM|LOW)$/.exec(f.value);
  if(m&&Number(m[1])<=100)return new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Number(m[1]))+'/100 · '+m[2];
  return f.value;
}
