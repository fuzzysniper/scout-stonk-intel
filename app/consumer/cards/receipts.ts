/** Offline only. Verifies local bytes, not publisher signatures or licensing. No network/filesystem calls. */
import {createHash} from 'node:crypto';
import {isSolanaMint} from '../../../lib/solana';
import {CARDS,REGISTRY} from './identity';
import {parseExactJson,numberLexeme} from './exact-json';
import {canonicalDecimal,decimalAtomic} from './decimal';
import {utcTime} from './performance';
import {utcMicroseconds} from './clock';
import type {ResearchSeries} from './performance';
export type Subject={mint:string;poolMint:string;quoteMint:string};
export type Capture={version:'cards-capture/1';evidenceClass:'public_source'|'synthetic_offline';url:string;requestedAt:string;receivedAt:string;httpStatus:number;ageSeconds:number|null;bodySha256:string;bodyBase64:string};
export type CaptureSource={url:string;requestedAt:string;receivedAt:string;providerGeneratedAt:string;bodySha256:string;evidenceClass:Capture['evidenceClass']};
export type Snapshot={kind:'untimed_usd_snapshot';subject:Subject;source:CaptureSource;actualMarketAt:null;
 exact:{priceUsd:string|null;liquidityUsd:string|null;volume24hUsd:string|null;marketCapUsd:string|null};
 priceMeaning:'provider_report_not_quote_price';capMeaning:'provider_report_supply_definition_unknown';volumeMeaning:'reported_trailing_window_not_participants';precision:'source_decimal_lexemes_preserved';rights:'unverified'};
export type FixturePoint={kind:'synthetic_point';subject:Subject;source:CaptureSource;observedAt:string;priceQuote:string;liquidityUsd:string|null;volume24hUsd:string|null};
export type NormalizationReason='invalid_receipt'|'invalid_identity'|'receipt_limit'|'source_rejected'|'source_rate_limited'|'source_unavailable'|'source_not_qualified'|'invalid_source_json'|'source_hash_mismatch'|'invalid_source_clock'|'stale_transport'|'registry_unverified'|'unsupported_decimal_precision'|'source_identity_mismatch'|'synthetic_not_live';
export type Normalized={state:'normalized';record:Snapshot|FixturePoint}|{state:'withheld';reason:NormalizationReason};
function fail(reason:NormalizationReason):never{throw Error(reason);}
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:fail('invalid_source_json');
const int=(v:unknown)=>{const raw=numberLexeme(v);return raw!==null&&/^\d+$/.test(raw)&&Number.isSafeInteger(Number(raw))?Number(raw):fail('invalid_source_json');};
export function validSubject(v:Subject):boolean{return !!v&&isSolanaMint(v.mint)&&isSolanaMint(v.poolMint)&&v.quoteMint===CARDS.mint&&v.mint!==v.poolMint&&v.mint!==v.quoteMint&&v.poolMint!==v.quoteMint;}
function exactAmount(v:unknown):string|null {
 if(v===undefined||v===null)return null;
 const raw=numberLexeme(v)??(typeof v==='string'?v:null),exact=raw===null?null:canonicalDecimal(raw);
 if(exact===null)fail('unsupported_decimal_precision');return exact;
}
function open(c:Capture,asOf:string):{root:Record<string,unknown>;source:CaptureSource}{
 if(!c||c.version!=='cards-capture/1'||!['public_source','synthetic_offline'].includes(c.evidenceClass)||typeof c.url!=='string'||typeof c.bodyBase64!=='string'||c.bodyBase64.length>1398104||typeof c.bodySha256!=='string'||!/^sha256:[a-f0-9]{64}$/.test(c.bodySha256))fail('invalid_receipt');
 const requested=utcMicroseconds(c.requestedAt),received=utcMicroseconds(c.receivedAt),now=utcMicroseconds(asOf);
 if(requested===null||received===null||now===null||requested>received||received-requested>12000000n||received>now+1000000n)fail('invalid_source_clock');
 let u:URL;try{u=new URL(c.url);}catch{fail('source_not_qualified');}
 if(u.protocol!=='https:'||u.username||u.password||u.hash||u.search)fail('source_not_qualified');
 if(c.evidenceClass==='public_source'?u.origin!=='https://www.stonkfun.xyz':u.origin!=='https://fixtures.invalid')fail('source_not_qualified');
 if(c.httpStatus===403||c.httpStatus===401)fail('source_rejected');
 if(c.httpStatus===429)fail('source_rate_limited');
 if(c.httpStatus!==200)fail('source_unavailable');
 if(c.ageSeconds===null||!Number.isSafeInteger(c.ageSeconds)||c.ageSeconds<0||c.ageSeconds>300)fail('stale_transport');
 const bytes=Buffer.from(c.bodyBase64,'base64');
 if(bytes.length>1024*1024||bytes.toString('base64')!==c.bodyBase64)fail('invalid_receipt');
 if('sha256:'+createHash('sha256').update(bytes).digest('hex')!==c.bodySha256)fail('source_hash_mismatch');
 let root:Record<string,unknown>;try{root=record(parseExactJson(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));}catch(e){if(e instanceof Error&&e.message==='invalid_source_json')throw e;fail('invalid_source_json');}
 const meta=c.evidenceClass==='public_source'?record(root.meta):root;
 const generated=utcMicroseconds(meta.generatedAt);
 if(generated===null||generated>received+1000000n||received-generated>10800000000n)fail('invalid_source_clock');
 return {root,source:{url:c.url,requestedAt:c.requestedAt,receivedAt:c.receivedAt,providerGeneratedAt:meta.generatedAt as string,bodySha256:c.bodySha256,evidenceClass:c.evidenceClass}};
}
export function verifyRegistry(c:Capture,asOf:string):boolean {
 try{
  const {root}=open(c,asOf),data=record(root.data);
  if(c.url!==(c.evidenceClass==='public_source'?REGISTRY:'https://fixtures.invalid/registry')||data.selectBy!=='mint'||!Array.isArray(data.pairs)||data.pairs.length>1024)return false;
  const matches=data.pairs.map(record).filter(p=>p.mint===CARDS.mint);
  return matches.length===1&&matches[0].symbol===CARDS.symbol&&matches[0].name===CARDS.name&&int(matches[0].decimals)===CARDS.decimals&&matches[0].tokenProgram===CARDS.program;
 }catch{return false;}
}
export function normalizeCapture(c:Capture,subject:Subject,asOf:string):Normalized {
 try{
  if(!validSubject(subject))fail('invalid_identity');const {root,source}=open(c,asOf);
  if(c.evidenceClass==='synthetic_offline'){
   if(c.url!=='https://fixtures.invalid/points/'+subject.mint||root.version!=='scout-offline-point/1'||root.mint!==subject.mint||root.poolMint!==subject.poolMint||root.quoteMint!==subject.quoteMint||root.kind!=='actual_market_observation')fail('source_identity_mismatch');
   const observed=utcTime(root.observedAt),generated=utcMicroseconds(source.providerGeneratedAt)!;
   if(observed===null||BigInt(observed)*1000n>generated)fail('invalid_source_clock');
   const priceQuote=exactAmount(root.priceQuote);if(priceQuote===null||decimalAtomic(priceQuote)===null||decimalAtomic(priceQuote)===0n)fail('unsupported_decimal_precision');
   return {state:'normalized',record:{kind:'synthetic_point',subject:{...subject},source,observedAt:root.observedAt as string,priceQuote,liquidityUsd:exactAmount(root.liquidityUsd),volume24hUsd:exactAmount(root.volume24hUsd)}};
  }
  if(c.url!=='https://www.stonkfun.xyz/api/public/v1/tokens/'+subject.mint)fail('source_not_qualified');
  const data=record(root.data),token=record(data.token),quote=record(token.quote);
  if(data.network!=='mainnet-beta'||token.mint!==subject.mint||token.pool!==subject.poolMint||quote.mint!==CARDS.mint||quote.symbol!==CARDS.symbol)fail('source_identity_mismatch');
  const market=record(token.market);
  // Even an added observedAt field does not establish semantics for this audited
  // untimed schema. A new provider clock/quote-price adapter needs separate review.
  return {state:'normalized',record:{kind:'untimed_usd_snapshot',subject:{...subject},source,actualMarketAt:null,
   exact:{priceUsd:exactAmount(market.priceUsd),liquidityUsd:exactAmount(market.liquidityUsd),volume24hUsd:exactAmount(market.volume24hUsd),marketCapUsd:exactAmount(market.marketCapUsd)},
   priceMeaning:'provider_report_not_quote_price',capMeaning:'provider_report_supply_definition_unknown',volumeMeaning:'reported_trailing_window_not_participants',precision:'source_decimal_lexemes_preserved',rights:'unverified'}};
 }catch(e){const known:NormalizationReason[]=['invalid_receipt','invalid_identity','receipt_limit','source_rejected','source_rate_limited','source_unavailable','source_not_qualified','invalid_source_json','source_hash_mismatch','invalid_source_clock','stale_transport','registry_unverified','unsupported_decimal_precision','source_identity_mismatch','synthetic_not_live'];return {state:'withheld',reason:e instanceof Error&&known.includes(e.message as NormalizationReason)?e.message as NormalizationReason:'invalid_receipt'};}
}
/** Fixtures may rehearse mathematics, never enter the public-source path. */
export function fixtureSeries(subject:Subject,records:readonly FixturePoint[]):ResearchSeries {
 return {...subject,points:records.map(r=>({kind:'actual_market_observation' as const,observedAt:r.observedAt,priceQuote:r.priceQuote,
  // Preserve exact USD context too: rounding up near a threshold must never admit it.
  liquidityUsd:r.liquidityUsd,volume24hUsd:r.volume24hUsd,source:r.source.url,revision:r.source.bodySha256}))};
}
