import type {IntelligenceSnapshot,SourceProjection,FactCard} from './contract';
import {INTELLIGENCE_POLICY as P} from './contract';
import {asset,deepFreeze,hash,isAdmitted,time} from './internal';
import {sourceFailure} from './source-off';
import {utcMicros} from '../onchain-mint/validation';
/** Process-local admitted projections only. JSON/type assertions confer no trust.
 * Exact identity and receipt alignment, not a cross-source issuer endorsement. */
export function joinEvidence(mint:string,projections:readonly SourceProjection[],evaluatedMs:number):IntelligenceSnapshot {
  const identity=asset(mint),evaluatedAt=time(evaluatedMs);
  if (!Array.isArray(projections)||!projections.length||projections.length>P.maxSources) throw Error('source_join_rejected');
  const seen=new Set<string>(),clocks:bigint[]=[],nowUs=BigInt(evaluatedMs)*1000n;
  const fetched=(p:SourceProjection):bigint=>{const us=utcMicros(p.evidence?.fetchedAt);if(us===null||us>nowUs)throw Error('source_join_rejected');return us;};
  for (const p of projections) {
    if (!isAdmitted(p)||p.asset.chain!==identity.chain||p.asset.mint!==identity.mint||seen.has(p.provider)) throw Error('source_join_rejected');
    seen.add(p.provider);
    if (p.evidence)clocks.push(fetched(p));
  }
  if (clocks.length>1){
    const sorted=[...clocks].sort((a,b)=>a<b?-1:a>b?1:0),span=sorted[sorted.length-1]-sorted[0];
    if(span>BigInt(P.maxJoinSkewMs)*1000n)throw Error('source_join_rejected');
  }
  const ordered:SourceProjection[]=[...projections].sort((a,b)=>a.provider<b.provider?-1:1);
  const stale=(p:SourceProjection)=>nowUs-fetched(p)>BigInt(P.retrievalMaxAgeMs)*1000n;
  const sources=ordered.flatMap(p=>p.evidence?[{...p.evidence,retrievalFreshness:stale(p)?'stale' as const:'recent' as const}]:[]);
  const facts=ordered.flatMap(p=>p.facts.map((f):FactCard=>{
    if (p.evidence&&stale(p)) return {...f,state:'unknown',fact:null,assessment:{color:'grey',rule:'receipt_expiry_v1',reason:'stale_receipt'}};
    return f;
  }));
  const body={version:'unfarmd-intelligence/1' as const,asset:identity,evaluatedAt,sources,pools:ordered.flatMap(p=>p.pool?[p.pool]:[]),facts,
    narrative:null,overallVerdict:null,publication:'withheld' as const};
  return deepFreeze({id:'unfarmd-intelligence/1:sha256:'+hash(body),...body});
}
/** Shipping default: no API dependency, callbacks, samples, storage or activation flags. */
export function sourceOffSnapshot(mint:string,evaluatedMs:number):IntelligenceSnapshot {
  return joinEvidence(mint,[sourceFailure('dexscreener',mint,'disabled'),sourceFailure('helius-solana-rpc',mint,'disabled')],evaluatedMs);
}
