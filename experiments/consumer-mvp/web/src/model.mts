import type {ExplainMintResult} from '../vendor/evidence/contract.js';
import {EXAMPLES,type CapturedExample,type ExplanationReply,type SourceReceipt} from './evidence.mjs';
const BASE58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
/** 32 decoded bytes, not a chain existence check. No normalization or aliases. */
export function isSolanaMint(value:string):boolean {
  if(value.length<32||value.length>44)return false;
  let n=0n;for(const c of value){const digit=BASE58.indexOf(c);if(digit<0)return false;n=n*58n+BigInt(digit);}
  const zeros=value.match(/^1*/)?.[0].length??0;let bytes=0;
  while(n>0n){bytes++;n>>=8n;}return zeros+bytes===32;
}
export function classifyInput(raw:string):'empty'|'invalid'|'needs_mint'|'unsupported'|'lookup' {
  if(!raw)return 'empty';
  if(raw!==raw.trim())return 'invalid';
  if(/^[a-zA-Z0-9$-]{1,12}$/.test(raw))return 'needs_mint';
  if(!isSolanaMint(raw))return 'invalid';
  return EXAMPLES.some(e=>e.mint===raw)?'lookup':'unsupported';
}
function safeUrl(raw:string,retained=false):boolean {
  try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&
    (retained?u.hostname==='github.com'&&/^\/fuzzysniper\/scout-stonk-intel\/blob\/[a-f0-9]{40}\/docs\/evidence\/pair-reward-audit-2026-10-14\.json$/.test(u.pathname):
      u.hostname==='www.stonkfun.xyz'&&(/^\/api\/public\/v1\//.test(u.pathname)||/^\/api\/v2\/tokens\/[1-9A-HJ-NP-Za-km-z]{32,44}\/rewards$/.test(u.pathname)));}
  catch{return false;}
}
/** Consumes B's exact result union. No old asOf, amount release or live fallback. */
export function projectEvidence(result:ExplainMintResult):ExplanationReply {
  if(result.schemaVersion!=='1')return {state:'unavailable',reason:'evidence_invalid'};
  if(result.status==='unsupported')return {state:result.reason==='invalid_mint'?'invalid':'unsupported'};
  if(result.status==='unavailable')return {state:'unavailable',reason:'evidence_unavailable'};
  try{
    const e=result.explanation,pin=EXAMPLES.find(p=>p.mint===e.token.mint);
    const quantities=[e.economicMechanism.lifetimeDistribution,e.economicMechanism.coveredIntervalFlow,e.economicMechanism.holderReturns,e.marketContext.liquidityUsd,e.marketContext.volume24hUsd];
    if(!pin||e.network!=='solana'||pin.quoteMint!==e.quote.mint||pin.quote!==e.quote.symbol||pin.symbol!==e.token.symbol||pin.name!==e.token.name||
       e.freshness.currentValueClaim!==false||!['stale','captured'].includes(e.freshness.state)||e.economicMechanism.settings!=='verified_at_capture'||
       e.economicMechanism.scope!=='provider_token_configuration'||e.economicMechanism.settlement!=='not_verified'||e.economicMechanism.holderEntitlement!=='unknown'||
       e.marketContext.state!=='withheld'||quantities.some(q=>q.value!==null||!['withheld_rights','not_observed','unsupported'].includes(q.state))||e.sources.length!==3)throw Error();
    const ids=new Map<string,string>();
    const labels={quote_registry:'Quote registry at capture',pair_catalog:'Token catalog at capture',reward_settings:'Reward settings at capture'};
    const sources:SourceReceipt[]=e.sources.map(s=>{
      const id=s.kind;if(ids.has(s.id)||!labels[id]||[...ids.values()].includes(id)||!s.retained||
        s.rights.permission!=='unverified'||s.rights.financialQuantities!=='withheld'||s.rights.publication!=='metadata_only'||
        !/^[a-f0-9]{64}$/.test(s.bodySha256)||!/^[a-f0-9]{64}$/.test(s.retained.documentSha256))throw Error();
      ids.set(s.id,id);
      const retained='https://github.com/fuzzysniper/scout-stonk-intel/blob/'+s.retained.commit+'/'+s.retained.path;
      if(!safeUrl(s.url)||!safeUrl(retained,true)||!Number.isFinite(Date.parse(s.capturedAt))||s.generatedAt!==null&&!Number.isFinite(Date.parse(s.generatedAt)))throw Error();
      return {id,label:labels[id],endpoint:s.url,capturedAt:s.capturedAt,sourceGeneratedAt:s.generatedAt,receiptSha256:s.bodySha256,documentSha256:s.retained.documentSha256,retainedAt:retained,rights:'unverified_metadata_only'};
    });
    const facts=[e.whatItIs,e.whatUserOwns,e.pairRelationship,e.economicMechanism.conclusion,...e.risksAndUnknowns];
    if(facts.some(f=>!f.sourceIds.length||f.sourceIds.some(id=>!ids.has(id))))throw Error();
    const underlying=pin.symbol==='SI'?'NVIDIA shares':pin.symbol==='GP'?'gold':'SpaceX shares';
    const explanation:[string,string]=[
      `${pin.symbol} is a Solana token recorded trading against ${pin.quote}.`,
      `Holding ${pin.symbol} means holding ${pin.symbol}, not ${pin.quote} or ${underlying}; payout rights are unverified.`,
    ];
    const example:CapturedExample={mint:pin.mint,name:pin.name,symbol:pin.symbol,network:'solana',mode:'retained_capture',quote:e.quote,explanation,
      facts:[{label:'Token and pair identity',detail:`${pin.symbol} token ↔ ${pin.quote} quote. Exact mints matched.`,sourceIds:e.pairRelationship.sourceIds.map(id=>ids.get(id)!)},
        {label:'Reward setting, not payouts',detail:'Provider setting only. Payment is not verified.',sourceIds:e.economicMechanism.conclusion.sourceIds.map(id=>ids.get(id)!)}],
      risks:[`${e.freshness.state==='stale'?'Stale':'Dated'} capture; current settings unverified.`,'Payouts, eligibility and holder returns are unverified.','Financial figures withheld; publication rights unverified.','Selected examples only; coverage is incomplete.'],
      sources,fullNotes:[e.whatItIs.text,e.whatUserOwns.text,e.pairRelationship.text,e.economicMechanism.conclusion.text,...e.risksAndUnknowns.map(f=>f.text)],
      freshness:e.freshness.state,evaluatedAt:e.freshness.evaluatedAt,financialFigures:'withheld',holderReturns:'unavailable',coverage:'curated_nonexhaustive'};
    return {state:'supported',example};
  }catch{return {state:'unavailable',reason:'evidence_invalid'};}
}
export async function explainWithEngine(raw:string,engine:(mint:string)=>ExplainMintResult):Promise<ExplanationReply>{
  const state=classifyInput(raw);if(state!=='lookup')return {state};
  try{return projectEvidence(engine(raw));}catch{return {state:'unavailable',reason:'evidence_unavailable'};}
}
export function shareUrl(current:string,mint:string):string {
  if(classifyInput(mint)!=='lookup')throw Error('unsupported_share');
  const u=new URL(current);u.search='';u.hash='';u.searchParams.set('mint',mint);return u.href;
}
export function sourceDate(source:SourceReceipt):string {
  return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(source.capturedAt));
}
