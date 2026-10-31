// Display-only JSON admission. Calculations and native provenance remain owned by A/B.
// The browser never reconstructs a verified Observation from these declared records.
export type EvidenceJson=null|boolean|number|string|readonly EvidenceJson[]|{readonly [key:string]:EvidenceJson};
export type FarmDisclosure=Readonly<{details:Readonly<Record<string,EvidenceJson>>}>;
const KEYS=['concentration','funding','cohorts','exits','liquidity'];
const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export function isFarmDisclosure(value:unknown):value is FarmDisclosure {
  let nodes=0,chars=0;const seen=new Set<object>();
  const json=(v:unknown,depth=0):boolean=>{
    if(++nodes>12000||depth>14)return false;
    if(typeof v==='string'){chars+=v.length;return v.length<=2048&&chars<=131072&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);}
    if(v===null||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return true;
    if(typeof v!=='object'||seen.has(v))return false;
    if(!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)return false;
    seen.add(v);const entries=Object.entries(Object.getOwnPropertyDescriptors(v));
    if(entries.length>1025)return false;
    for(const [key,p] of entries){if(Array.isArray(v)&&key==='length')continue;if(!p.enumerable||!('value' in p)||key.length>128||!json(p.value,depth+1))return false;}
    seen.delete(v);return true;
  };
  if(!json(value)||!record(value)||!record(value.details)||Object.keys(value.details).sort().join(',')!==[...KEYS].sort().join(','))return false;
  return KEYS.every(key=>{const d=value.details as Record<string,unknown>,v=d[key];return record(v)&&['reported','withheld'].includes(String(v.status))&&typeof v.reason==='string'&&Array.isArray(v.evidence)&&Array.isArray(v.transactions)&&record(v.metrics)&&(v.window===null||record(v.window));});
}
export function farmDetail(disclosure:FarmDisclosure|undefined,id:string):EvidenceJson|undefined {
  const key=id.startsWith('farming-')?id.slice(8):'';
  return KEYS.includes(key)?disclosure?.details[key]:undefined;
}
