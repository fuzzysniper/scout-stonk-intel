import {createHash} from 'node:crypto';
import {isExactSolanaMint,utcMicros} from '../consumer-mvp/evidence/guards';
export {isExactSolanaMint};
export const VERSION='agent0/1';
export type Mode='recorded'|'synthetic';
export const SAFETY_RULES=[
 'No leverage, signing, custody transfer, onchain lock or minimum trade count.',
 'Personal Agent 0 capital is separate from customer, company, Storkcoin treasury and collector funds.',
 'Reserve is a policy label, not a cryptographic lock.',
 'After a loss or failed exit: pause until fresh evidence and a new founder review. No automatic restart.',
 'Source rights, costs, quote conversion and size-aware exits must be established before exposure; this app cannot authorize wallet actions.'
] as const;
export type Policy={rules:readonly string[];version:string;capitalCents:number;reserveCents:number;sleeveCents:number;perTokenCents:number;liveAllocationCents:0};
export const DEFAULT_POLICY:Policy={rules:SAFETY_RULES,version:'agent0-policy/1',capitalCents:5000,reserveCents:4000,sleeveCents:1000,perTokenCents:1000,liveAllocationCents:0};
export function canonical(x:unknown):string {
 if(x===null||typeof x==='string'||typeof x==='boolean')return JSON.stringify(x);
 if(typeof x==='number'){if(!Number.isSafeInteger(x))throw Error('unsafe_number');return String(x);}
 if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
 if(typeof x==='object')return '{'+Object.entries(x as Record<string,unknown>).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
 throw Error('unsupported_json');
}
export const sha=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
export function object(x:unknown):Record<string,unknown>{if(!x||typeof x!=='object'||Array.isArray(x))throw Error('object_required');return x as Record<string,unknown>;}
export function keys(x:Record<string,unknown>,expected:string[]){if(Object.keys(x).some(k=>!expected.includes(k))||expected.some(k=>!(k in x)))throw Error('unexpected_fields');}
export function text(x:unknown,max=1200):string{if(typeof x!=='string'||!x.trim()||x.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x))throw Error('invalid_text');return x;}
export function time(x:unknown):string{if(typeof x!=='string'||utcMicros(x)===null)throw Error('invalid_utc');return x;}
export const micros=(x:string)=>utcMicros(time(x))!;
export function mint(x:unknown):string{if(!isExactSolanaMint(x))throw Error('exact_mint_required');return x;}
export function uint(x:unknown):string{if(typeof x!=='string'||!/^(0|[1-9]\d{0,19})$/.test(x)||BigInt(x)>18446744073709551615n)throw Error('u64_string_required');return x;}
export function integer(x:unknown,min:number,max:number):number{if(typeof x!=='number'||!Number.isSafeInteger(x)||x<min||x>max)throw Error('invalid_integer');return x;}
export function digest(x:unknown):string{if(typeof x!=='string'||!/^([a-f0-9]{64})$/.test(x))throw Error('invalid_digest');return x;}
export function decimal(raw:string,decimals:number):string{uint(raw);integer(decimals,0,255);if(!decimals)return raw;const s=raw.padStart(decimals+1,'0');return s.slice(0,-decimals)+'.'+s.slice(-decimals);}
export function validatePolicy(x:unknown):Policy {
 const p=object(x);keys(p,['rules','version','capitalCents','reserveCents','sleeveCents','perTokenCents','liveAllocationCents']);
 if(canonical(p.rules)!==canonical(SAFETY_RULES))throw Error('safety_rules_must_remain');
 if(p.version!=='agent0-policy/1'||p.liveAllocationCents!==0)throw Error('inactive_policy_required');
 const capitalCents=integer(p.capitalCents,3000,10000),reserveCents=integer(p.reserveCents,0,10000),sleeveCents=integer(p.sleeveCents,0,1000),perTokenCents=integer(p.perTokenCents,0,1000);
 if(reserveCents+sleeveCents!==capitalCents||sleeveCents*5>capitalCents||perTokenCents>sleeveCents)throw Error('reserve_or_exposure_limit');
 return {rules:SAFETY_RULES,version:'agent0-policy/1',capitalCents,reserveCents,sleeveCents,perTokenCents,liveAllocationCents:0};
}
export type Source={kind:'repo_reward'|'synthetic_offline';locator:string;datasetSha256:string;catalogSha256:string;recordSha256:string};
export const UNOBSERVED_ONCHAIN={program:null,finalizedSlot:null,supplyRaw:null,decimals:null,mintAuthority:null,freezeAuthority:null,token2022:null} as const;
export type Observation={onchain:typeof UNOBSERVED_ONCHAIN;mint:string;name:string;observedAt:string;providerGeneratedAt:string|null;source:Source;quoteMint:string|null;pool:string|null;quality:'capture_only'|'conflicting_duplicates';note:string};
export function validateObservation(x:unknown,mode:Mode):Observation {
 const p=object(x);keys(p,['onchain','mint','name','observedAt','providerGeneratedAt','source','quoteMint','pool','quality','note']);
 const chain=object(p.onchain);keys(chain,Object.keys(UNOBSERVED_ONCHAIN));if(Object.values(chain).some(v=>v!==null))throw Error('no_finalized_onchain_source');
 const m=mint(p.mint),s=object(p.source);keys(s,['kind','locator','datasetSha256','catalogSha256','recordSha256']);
 if(s.kind!==(mode==='recorded'?'repo_reward':'synthetic_offline'))throw Error('source_mode_mismatch');
 if(mode==='recorded'&&s.locator!==`https://www.stonkfun.xyz/api/public/v1/tokens/${m}/rewards`)throw Error('source_identity_mismatch');
 if(mode==='synthetic'&&s.locator!=='offline:invented-agent0-fixture')throw Error('synthetic_label_required');
 if(!['capture_only','conflicting_duplicates'].includes(String(p.quality)))throw Error('invalid_quality');
 const observedAt=time(p.observedAt),providerGeneratedAt=p.providerGeneratedAt===null?null:time(p.providerGeneratedAt);
 if(providerGeneratedAt&&micros(providerGeneratedAt)>micros(observedAt))throw Error('provider_clock_ahead');
 return {onchain:{...UNOBSERVED_ONCHAIN},mint:m,name:text(p.name,80),observedAt,providerGeneratedAt,source:{kind:s.kind as Source['kind'],locator:text(s.locator,250),datasetSha256:digest(s.datasetSha256),catalogSha256:digest(s.catalogSha256),recordSha256:digest(s.recordSha256)},quoteMint:p.quoteMint===null?null:mint(p.quoteMint),pool:p.pool===null?null:mint(p.pool),quality:p.quality as Observation['quality'],note:text(p.note)};
}
export type Decision={mint:string;action:'wait'|'reject'|'shadow'|'review';evidenceHashes:string[];policyHash:string;criteriaVersion:'agent0-qualification/1';criteriaSnapshot:Qualification;hypothesis:string;disqualifiers:string;missingEvidence:string;entryConditions:string;invalidation:string;exitConsiderations:string};
export type Claim={walletLabel:string;signature:string;mint:string;raw:string;decimals:number;direction:'in'|'out';transactionAt:string;note:string};
const B58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function signature(x:unknown):string{const s=text(x,88);if(/^1+$/.test(s))throw Error('invalid_signature');let n=0n;for(const c of s){const d=B58.indexOf(c);if(d<0)throw Error('invalid_signature');n=n*58n+BigInt(d);}let bytes=0;while(n){bytes++;n>>=8n;}for(const c of s){if(c!=='1')break;bytes++;}if(bytes!==64)throw Error('signature_64_bytes_required');return s;}
export function encode58(bytes:Uint8Array):string{let n=0n;for(const x of bytes)n=n*256n+BigInt(x);let s='';while(n){s=B58[Number(n%58n)]+s;n/=58n;}for(const x of bytes){if(x)break;s='1'+s;}return s;}
export type Entry={version:typeof VERSION;seq:number;mode:Mode;at:string;requestId:string;previous:string;kind:'policy'|'observation'|'decision'|'claim'|'shadow_plan'|'outcome';data:unknown;hash:string};
export type Qualification={state:'SHADOW ONLY'|'INSUFFICIENT EVIDENCE'|'ELIGIBLE FOR FOUNDER REVIEW';priority:'Evidence blocked'|'Shadow research';reason:string;dimensions:{name:string;state:'NOT OBSERVED'|'CONFLICT';requirement:string}[]};
export function qualify(mode:Mode,obs:Observation[]):Qualification{
 const dimensions=[
  ['Freshness / comparable periods','No aligned market/finality observations. Original clocks and strict source freshness cannot be inferred from import time.'],
  ['Token age / discovery timing','Finalized creation/launch evidence; first local capture is not token age.'],
  ['Finalized mint controls / supply changes','Retained validated MintFactsV1, actual finalized slot and clock; extension limitations.'],
  ['Liquidity / feasible exit','Exact pool/quote identities, depth and size-aware exit evidence; price alone is insufficient.'],
  ['Volume / buys / sells / participation','Timestamped, comparable activity windows with source rights and manipulation limits.'],
  ['Holder / deployer concentration','Attributable distribution and relationships; reward holderCount is not concentration.'],
  ['Persistent momentum / asymmetry','Aligned independent price/liquidity history, not one spike or lifetime distributions.']
 ].map(([name,requirement])=>({name,requirement,state:'NOT OBSERVED' as 'NOT OBSERVED'|'CONFLICT'}));
 if(obs.some(o=>o.quality==='conflicting_duplicates'))dimensions.push({name:'Conflicting source records',state:'CONFLICT',requirement:'Resolve conflicting same-time records without overwriting originals.'});
 return {state:mode==='synthetic'?'SHADOW ONLY':'INSUFFICIENT EVIDENCE',priority:mode==='synthetic'?'Shadow research':'Evidence blocked',reason:'Reward captures cannot establish tradability, token controls or investment edge. No opportunity ranking is supported.',dimensions};
}
export function observations(entries:Entry[],m?:string):{entry:Entry;observation:Observation}[]{return entries.filter(e=>e.kind==='observation').map(entry=>({entry,observation:entry.data as Observation})).filter(x=>!m||x.observation.mint===m);}
export function latestPolicy(entries:Entry[]){const p=[...entries].reverse().find(e=>e.kind==='policy');if(!p)throw Error('policy_missing');return {entry:p,policy:validatePolicy(p.data)};}
export function candidateList(entries:Entry[]){
 const groups=new Map<string,ReturnType<typeof observations>>();for(const x of observations(entries)){const group=groups.get(x.observation.mint)||[];group.push(x);groups.set(x.observation.mint,group);}
 return [...groups.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([m,rows])=>({mint:m,name:rows[0].observation.name,discoveredAt:rows[0].entry.at,earliestObservedAt:rows.reduce((a,x)=>micros(x.observation.observedAt)<micros(a)?x.observation.observedAt:a,rows[0].observation.observedAt),latestObservedAt:rows.reduce((a,x)=>micros(x.observation.observedAt)>micros(a)?x.observation.observedAt:a,rows[0].observation.observedAt),evidence:rows.map(x=>({hash:x.entry.hash,availableAt:x.entry.at,...x.observation})),qualification:qualify(rows[0].entry.mode,rows.map(x=>x.observation)),decisions:entries.filter(e=>e.kind==='decision'&&(e.data as Decision).mint===m)}));
}
export function claimedHoldings(entries:Entry[]){
 const groups=new Map<string,{mint:string;walletLabel:string;decimals:number;raw:bigint;records:number}>();
 for(const e of entries.filter(e=>e.kind==='claim')){const c=e.data as Claim,key=c.walletLabel+'|'+c.mint;const old=groups.get(key)||{mint:c.mint,walletLabel:c.walletLabel,decimals:c.decimals,raw:0n,records:0};if(old.decimals!==c.decimals)throw Error('conflicting_decimals');old.raw+=(c.direction==='in'?1n:-1n)*BigInt(c.raw);old.records++;groups.set(key,old);}
 return [...groups.values()].map(x=>({...x,raw:x.raw.toString(),state:x.raw<0n?'INCOMPLETE CLAIM HISTORY':'MANUAL CLAIM — UNCONFIRMED',valuation:'UNPRICED',realizedReturn:null,unrealizedReturn:null}));
}
