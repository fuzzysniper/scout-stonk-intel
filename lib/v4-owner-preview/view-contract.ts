/** Presentation only; provider facts are projected from Agent A's canonical contract. */
export type FactView=Readonly<{id:string;label:string;value:string|null;unit:string;status:'reported'|'stale'|'unknown';source:string|null;observedAt:string|null;receivedAt:string|null;reason:string;path:string|null;responseSha256:string|null;captureKind:string|null}>;
export type RiskFinding=Readonly<{
 id:string;pillar:'rug'|'farm'|'momentum';tone:'red'|'yellow'|'green'|'gray';
 title:string;value:string|null;explanation:string;
 fieldPath:string|null;source:string|null;observedAt:string|null;responseSha256:string|null;
}>;
export type InspectView=Readonly<{riskFindings?:readonly RiskFinding[];mint:string;state:'sources_off'|'partial'|'unavailable'|'offline_fixture'|'offline_replay';identity:'unverified'|'provider_reported'|'rpc_reported_mint'|'not_found'|'unsupported';name:string|null;symbol:string|null;identityNote:string;facts:readonly FactView[];windows:Readonly<Record<'5m'|'1h'|'24h',readonly FactView[]>>;controls:readonly FactView[];observations:readonly string[];contradictions:readonly string[];gaps:readonly string[]}>;
export const METRICS=Object.freeze([['priceUsd','Price','USD'],['mcapUsd','Market cap','USD'],['fdvUsd','FDV','USD'],['liquidityUsd','Liquidity','USD'],['holders','Holders','accounts'],['mintAge','Token age','time']] as const);
export function unavailableView(mint:string,reason:string):InspectView{return {mint,state:'sources_off',identity:'unverified',name:null,symbol:null,identityNote:'Token existence and identity have not been observed.',facts:METRICS.map(([id,label,unit])=>({id,label,unit,value:null,status:'unknown',source:null,observedAt:null,receivedAt:null,reason,path:null,responseSha256:null,captureKind:null})),windows:{'5m':[],'1h':[],'24h':[]},controls:[],observations:[],contradictions:[],gaps:[reason]};}
export function isInspectView(v:unknown,mint:string):v is InspectView{
 if(!v||typeof v!=='object'||Array.isArray(v))return false;const r=v as InspectView;
 const text=(s:unknown,n:number)=>typeof s==='string'&&s.length<=n&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s);
 const clock=(s:unknown)=>s===null||text(s,40)&&Number.isFinite(Date.parse(s as string));
 const fact=(x:unknown)=>{if(!x||typeof x!=='object')return false;const f=x as FactView;return text(f.id,64)&&text(f.label,80)&&(f.value===null||text(f.value,128))&&text(f.unit,32)&&['reported','stale','unknown'].includes(f.status)&&(f.source===null||text(f.source,80))&&clock(f.observedAt)&&clock(f.receivedAt)&&(f.responseSha256===null||typeof f.responseSha256==='string'&&/^[a-f0-9]{64}$/.test(f.responseSha256))&&(f.captureKind===null||['synthetic_fixture','recorded_response','native_https'].includes(f.captureKind))&&text(f.reason,1000)&&(f.path===null||text(f.path,200));};
 const list=(x:unknown,n:number)=>Array.isArray(x)&&x.length<=n&&x.every(fact)&&new Set(x.map(f=>f.id)).size===x.length;
 const prose=(x:unknown)=>Array.isArray(x)&&x.length<=24&&x.every(s=>text(s,1000));
 const rf=r.riskFindings;
 const riskValid=rf===undefined||(Array.isArray(rf)&&rf.length<=12&&new Set(rf.map(x=>x.id)).size===rf.length&&rf.every(x=>!!x&&typeof x==='object'
  &&text(x.id,64)&&text(x.title,128)&&(x.value===null||text(x.value,128))
  &&text(x.explanation,1000)&&['rug','farm','momentum'].includes(x.pillar)
  &&['red','yellow','green','gray'].includes(x.tone)
  &&(x.source===null||text(x.source,128))&&(x.fieldPath===null||text(x.fieldPath,128))
  &&clock(x.observedAt)&&(x.responseSha256===null||typeof x.responseSha256==='string'&&/^[a-f0-9]{64}$/.test(x.responseSha256))));
 return riskValid&&r.mint===mint&&['sources_off','partial','unavailable','offline_fixture','offline_replay'].includes(r.state)&&['unverified','provider_reported','rpc_reported_mint','not_found','unsupported'].includes(r.identity)&&(r.name===null||text(r.name,128))&&(r.symbol===null||text(r.symbol,32))&&text(r.identityNote,512)&&list(r.facts,16)&&list(r.controls,16)&&!!r.windows&&['5m','1h','24h'].every(p=>list(r.windows[p as keyof typeof r.windows],10))&&prose(r.observations)&&prose(r.contradictions)&&prose(r.gaps);
}
