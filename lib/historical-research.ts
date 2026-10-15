/** Offline only: original receipt replay, no HTTP, implicit clock or current fallback. */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import manifest from '../docs/evidence/historical-research-manifest.json';
import {auditPairRewards} from './pair-reward-audit';
import type {RewardAuditPacket,PairRewardAudit} from './pair-reward-audit-contract';
import type {LedgerLifetime} from './reward-lifetime';
export const HISTORICAL_EVIDENCE_PATH=manifest.evidencePath;
type Capture={path:string;capturedAt:string;status:number|null;headers:Record<string,string>;bytes:number;bodySha256:string;body:string};
export type HistoricalRecord={
 id:string; tokenMint:string; symbol:string;
 unit:{mint:string;symbol:string;decimals:number;symbolAmbiguous:boolean};
 temporalState:'historical_not_current'; evidenceTier:'dated_provider_reported_lifetime';
 modeVerification:'verified_at_capture'; chainVerified:false;
 source:{endpoint:string;capturedAt:string;originalCapturedAt:string;providerGeneratedAt:string;receiptSha256:string;documentSha256:string;commit:string;path:string};
 lifetime:LedgerLifetime; coverage:PairRewardAudit['coverage'];
 recentFlow:null; holderReturn:null; historicalPrice:null; comparablePeriod:null;
};
export type HistoricalRead={state:'verified';records:HistoricalRecord[]}|{state:'withheld';reason:'evidence_unavailable'|'evidence_integrity_failed'|'capture_invalid';records:[]};
const sha=(v:string)=>createHash('sha256').update(v,'utf8').digest('hex');
// Pins are reviewed source constants, never supplied by query/env/browser input.
export function readHistoricalEvidence(bytes:string|null):HistoricalRead {
 if(bytes===null)return {state:'withheld',reason:'evidence_unavailable',records:[]};
 if(Buffer.byteLength(bytes)>1024*1024 || sha(bytes)!==manifest.evidenceSha256)return {state:'withheld',reason:'evidence_integrity_failed',records:[]};
 try {
  const evidence=JSON.parse(bytes) as {asOf:string;quoteMints:string[];packets:Capture[];offlineReport:{reports:PairRewardAudit[]}};
  if(evidence.asOf!==manifest.auditAsOf || evidence.quoteMints.length!==4 || !Array.isArray(evidence.packets) || evidence.packets.length>32)throw Error();
  const paths=new Set<string>();
  for(const p of evidence.packets){
   if(paths.has(p.path) || typeof p.body!=='string' || Buffer.byteLength(p.body)!==p.bytes || sha(p.body)!==p.bodySha256)throw Error();
   paths.add(p.path);
  }
  const packet=(p:Capture):RewardAuditPacket=>({source:'https://www.stonkfun.xyz'+p.path,fetchedAt:new Date(p.capturedAt).toISOString(),status:p.status,body:p.body,ageSeconds:p.headers.age==null?null:Number(p.headers.age)});
  const records=manifest.records.map(pin=>{
   const registry=evidence.packets.find(p=>p.path==='/api/public/v1/pairs');
   const catalog=evidence.packets.find(p=>p.path==='/api/public/v1/tokens?sort=marketCap&page=1&pageSize=25&quoteMint='+pin.quoteMint);
   const selected=new Set<string>(catalog?JSON.parse(catalog.body).data.tokens.filter((t:{mode:string})=>t.mode==='reward').slice(0,4).map((t:{mint:string})=>t.mint):[]);
   const rewards=evidence.packets.filter(p=>/^\/api\/v2\/tokens\/[^/]+\/rewards$/.test(p.path) && selected.has(p.path.split('/')[4]));
   const report=auditPairRewards({quoteMint:pin.quoteMint,asOf:evidence.asOf,registry:registry?packet(registry):null,catalog:catalog?packet(catalog):null,rewards:rewards.map(packet)});
   if(!isDeepStrictEqual(report,evidence.offlineReport.reports.find(r=>r.quote?.mint===pin.quoteMint)))throw Error();
   const c=report.candidates.find(c=>c.mint===pin.tokenMint),q=report.quote;
   const receipt=evidence.packets.find(p=>'https://www.stonkfun.xyz'+p.path===pin.source);
   if(!q || !c || !receipt || c.state!=='eligible' || c.modeVerification!=='verified_reward' || !c.lifetime || !c.source ||
      q.symbol!==pin.quoteSymbol || q.decimals!==pin.decimals || q.symbolAmbiguous!==pin.quoteSymbolAmbiguous || c.symbol!==pin.symbol ||
      c.source.revision!=='sha256:'+pin.receiptSha256 || receipt.bodySha256!==pin.receiptSha256 || receipt.capturedAt!==pin.originalCapturedAt ||
      c.source.fetchedAt!==pin.capturedAt || c.source.providerGeneratedAt!==pin.providerGeneratedAt)throw Error();
   return {id:sha([c.mint,q.mint,pin.source,pin.receiptSha256,pin.originalCapturedAt].join('\n')),tokenMint:c.mint,symbol:c.symbol,
    unit:{mint:q.mint,symbol:q.symbol,decimals:q.decimals,symbolAmbiguous:q.symbolAmbiguous},
    temporalState:'historical_not_current' as const,evidenceTier:'dated_provider_reported_lifetime' as const,modeVerification:'verified_at_capture' as const,chainVerified:false as const,
    source:{endpoint:pin.source,capturedAt:pin.capturedAt,originalCapturedAt:pin.originalCapturedAt,providerGeneratedAt:pin.providerGeneratedAt,receiptSha256:pin.receiptSha256,documentSha256:manifest.evidenceSha256,commit:manifest.evidenceCommit,path:manifest.evidencePath},
    lifetime:c.lifetime,coverage:report.coverage,recentFlow:null,holderReturn:null,historicalPrice:null,comparablePeriod:null};
  });
  return {state:'verified',records};
 }catch{return {state:'withheld',reason:'capture_invalid',records:[]};}
}
/** Deliberate allowlist projection. No financial quantities are publishable yet.
 * Rights approval requires another reviewed code change, not a runtime switch. */
export function publicHistoricalResearch(read:HistoricalRead){
 return {schemaVersion:1 as const,state:read.state,reason:read.state==='withheld'?read.reason:null,
  rights:{state:'unverified' as const,financialPublication:'withheld' as const},
  records:read.records.map(r=>({id:r.id,tokenMint:r.tokenMint,symbol:r.symbol,
   unit:{mint:r.unit.mint,symbol:r.unit.symbol,decimals:r.unit.decimals,symbolAmbiguous:r.unit.symbolAmbiguous},
   source:{endpoint:r.source.endpoint,capturedAt:r.source.capturedAt,originalCapturedAt:r.source.originalCapturedAt,providerGeneratedAt:r.source.providerGeneratedAt,receiptSha256:r.source.receiptSha256,documentSha256:r.source.documentSha256,commit:r.source.commit,path:r.source.path},temporalState:r.temporalState,evidenceTier:r.evidenceTier,
   lifetime:null,recentFlow:null,holderReturn:null,historicalPrice:null,comparablePeriod:null,
   sampling:'Four inspected reward candidates per exact quote; market-cap-selected, incomplete and non-atomic. Ecosystem leader unknown.' as const}))};
}
