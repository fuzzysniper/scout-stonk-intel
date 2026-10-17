import type {Metadata} from 'next';
import {explainMint,listSupportedMints,type ExplainMintResult,type MintExplanation} from '../../experiments/consumer-mvp/evidence';
import {isExactSolanaMint} from '../../experiments/consumer-mvp/evidence/guards';
// One reviewed engine, no vendor copy, live fallback or historical clock override.
export const examples=listSupportedMints();
export type HomeState={state:'idle'|'empty'|'invalid'|'needs_mint'|'unsupported'|'unavailable'}|{state:'supported';evidence:MintExplanation};
export const messages={
 empty:['Start with a mint','Paste a full Solana token mint, or choose a captured example below.'],
 needs_mint:['A ticker isn’t an identity','Different tokens can share a name or ticker. Paste the exact mint, or select a captured example below.'],
 invalid:['That doesn’t look like a mint','Use a full, case-sensitive Solana mint address. Links and recovery phrases are not accepted.'],
 unsupported:['Not in these examples','This address may exist, but only three reviewed token mints are supported. No provider or onchain lookup was made.'],
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
 return [`${e.token.symbol} is a Solana token recorded trading against ${e.quote.symbol}.`,
  `Holding ${e.token.symbol} means holding ${e.token.symbol}, not ${e.quote.symbol} or ${underlying}; payout rights are unverified.`];
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
 const title=token?`${token.symbol} explained · captured 14 Oct 2026`:'Understand a Solana token';
 const description='What it is, what was verified, and what remains unknown. Three dated examples from 14 October 2026; stale, not live data. Financial figures withheld.';
 // Next 15 strips root-query URLs when metadataBase is set. Absolute strings
 // with an explicit null base preserve the exact-mint canonical and og:url.
 return {metadataBase:null,title:{absolute:title},description,robots:{index:false,follow:false},alternates:{canonical},
  openGraph:{title,description,type:'website',url:canonical,images:[{url:image,width:1200,height:630,alt:'Understand a Solana token · dated examples, not live data'}]},
  twitter:{card:'summary_large_image',title,description,images:[image]}};
}
