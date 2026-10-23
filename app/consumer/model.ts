import type {Metadata} from 'next';
import {explainMint,listSupportedMints,type ExplainMintResult,type MintExplanation} from '../../experiments/consumer-mvp/evidence';
import {isExactSolanaMint} from '../../experiments/consumer-mvp/evidence/guards';
import {escapeArt} from './brand/art';
// One reviewed engine, no vendor copy, live fallback or historical clock override.
export const examples=listSupportedMints();
export type HomeState={state:'idle'|'empty'|'invalid'|'needs_mint'|'unsupported'|'unavailable'}|{state:'supported';evidence:MintExplanation};
export const messages={
 empty:['Start with a token address','Paste a token address, or explore an example below.'],
 needs_mint:['A name isn’t an address','Different tokens can share a name or ticker. Paste the full token address, or choose an example below.'],
 invalid:['That doesn’t look like a token address','Use a full, case-sensitive Solana token address. Links and recovery phrases are not accepted.'],
 unsupported:['Not in these examples','This address may exist, but only three reviewed token addresses are supported. No live source or blockchain lookup was made.'],
 unavailable:['Evidence couldn’t load','Nothing is verified for this request. The dated evidence could not be safely evaluated. Check your device clock and try again. No live provider was queried.'],
} as const;
/** A second fail-closed publication boundary; never serialize promoted quantities. */
export function projectEvidence(result:ExplainMintResult):HomeState {
 if(result.schemaVersion!=='1')return {state:'unavailable'};
 if(result.status==='unsupported')return {state:result.reason==='invalid_mint'?'invalid':'unsupported'};
 if(result.status==='unavailable')return {state:'unavailable'};
 const e=result.explanation;
 const pin=examples.find(p=>p.mint===e.token.mint);
 const quantities=[e.economicMechanism.lifetimeDistribution,e.economicMechanism.coveredIntervalFlow,e.economicMechanism.holderReturns,e.marketContext.liquidityUsd,e.marketContext.volume24hUsd];
 if(!pin||pin.quoteMint!==e.quote.mint||pin.quoteSymbol!==e.quote.symbol||pin.symbol!==e.token.symbol||pin.name!==e.token.name||
    e.freshness.currentValueClaim!==false||e.economicMechanism.settings!=='verified_at_capture'||e.economicMechanism.scope!=='provider_token_configuration'||
    e.economicMechanism.settlement!=='not_verified'||e.economicMechanism.holderEntitlement!=='unknown'||e.marketContext.state!=='withheld'||
    quantities.some(q=>q.value!==null||!['withheld_rights','not_observed','unsupported'].includes(q.state))||e.sources.length!==3||
    e.sources.some(s=>s.rights.permission!=='unverified'||s.rights.publication!=='metadata_only'||s.rights.financialQuantities!=='withheld'))return {state:'unavailable'};
 return {state:'supported',evidence:e};
}
export function evaluateInput(raw:string|string[]|undefined):HomeState {
 if(raw===undefined)return {state:'idle'};
 if(Array.isArray(raw))return {state:'invalid'};
 if(raw==='')return {state:'empty'};
 if(/^[a-zA-Z0-9$-]{1,12}$/.test(raw))return {state:'needs_mint'};
 try{return projectEvidence(explainMint(raw));}catch{return {state:'unavailable'};}
}
export function plainExplanation(e:MintExplanation):readonly [string,string] {
 const underlying=e.token.symbol==='SI'?'NVIDIA shares':e.token.symbol==='GP'?'gold':'SpaceX shares';
 const label=e.token.symbol==='SI'?'NVIDIA':e.token.symbol==='GP'?'GOLD':'SPACEX';
 return [`${e.token.name} is a crypto token recorded trading against ${e.quote.symbol}, a token StonkFun labels “${label}”.`,
  `Buying ${e.token.name} doesn’t mean ${e.token.symbol==='GP'?'owning':'buying'} ${underlying} or owning ${e.quote.symbol}.`];
}
/** Visitor copy is a projection of the original cited facts, never a new evidence state. */
export function consumerFacts(e:MintExplanation) {
 return [
  {title:'Token and pairing',detail:`Exact token and ${e.quote.symbol} addresses matched.`,sourceIds:e.pairRelationship.sourceIds},
  {title:'How rewards are supposed to work',detail:`A reward feature was reported for this ${e.quote.symbol} pair. Holder payments and eligibility are unverified.`,sourceIds:e.economicMechanism.conclusion.sourceIds},
 ] as const;
}

export function sharePath(mint:string):string {
 if(!examples.some(e=>e.mint===mint))throw Error('unsupported_share');
 return '/?mint='+encodeURIComponent(mint);
}
export function legacyPath(raw:string):string {
 return '/terminal'+(isExactSolanaMint(raw)?'?mint='+encodeURIComponent(raw):'');
}
export function consumerMetadata(raw:string|string[]|undefined):Metadata {
 const token=typeof raw==='string'?examples.find(e=>e.mint===raw):undefined;
 const canonical='https://scout.storkcoin.xyz'+(token?sharePath(token.mint):'/');
 const image='https://scout.storkcoin.xyz/opengraph-image';
 const title=token?`${token.symbol} explained · captured 14 Oct 2026 · UNFARMD`:'UNFARMD · Scout a Solana token';
 const description='Solana token research: facts, concerns and unknowns. Live checks restricted. Three dated examples from 14 October 2026; stale, not live data. Financial figures withheld. Proposed launch brand.';
 // Next 15 strips root-query URLs when metadataBase is set. Absolute strings
 // with an explicit null base preserve the exact-mint canonical and og:url.
 return {metadataBase:null,title:{absolute:title},description,robots:{index:false,follow:false},alternates:{canonical},icons:{icon:escapeArt.avatar},
  openGraph:{title,description,type:'website',url:canonical,images:[{url:image,width:1200,height:630,alt:'UNFARMD · proposed launch brand · restricted live checks · dated examples, not live data'}]},
  twitter:{card:'summary_large_image',title,description,images:[image]}};
}
