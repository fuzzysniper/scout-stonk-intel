// SYNTHETIC OFFLINE ONLY. No captured financial bodies, private positions or live facts.
import {createHash} from 'node:crypto';
import {CARDS,MINT,POOL,OTHER,AT,START} from './fixtures.mjs';
export const subject={mint:MINT,poolMint:POOL,quoteMint:CARDS};
export const second={mint:OTHER,poolMint:'6CvFE14WUwKkQv1WchdPmbde6Urq7EWofaJcE8ZVUVBZ',quoteMint:CARDS};
const registryRow={mint:CARDS,symbol:'CARDS',name:'Collector Crypt',decimals:6,tokenProgram:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'};
export function receipt(body,{fixture=false,url='https://www.stonkfun.xyz/api/public/v1/tokens/'+MINT,...rest}={}){
 const bytes=Buffer.from(typeof body==='string'?body:JSON.stringify(body));return {version:'cards-capture/1',evidenceClass:fixture?'synthetic_offline':'public_source',url,requestedAt:AT,receivedAt:AT,httpStatus:200,ageSeconds:0,bodySha256:'sha256:'+createHash('sha256').update(bytes).digest('hex'),bodyBase64:bytes.toString('base64'),...rest};
}
export function registry(fixture=false){return receipt({data:{selectBy:'mint',pairs:[registryRow]},...(fixture?{generatedAt:AT}:{meta:{generatedAt:AT}})},{fixture,url:fixture?'https://fixtures.invalid/registry':'https://www.stonkfun.xyz/api/public/v1/pairs'});}
export function snapshot(overrides={}){return {data:{network:'mainnet-beta',token:{mint:MINT,pool:POOL,quote:{mint:CARDS,symbol:'CARDS'},market:{priceUsd:0.000123,liquidityUsd:15000,volume24hUsd:2000,marketCapUsd:123000,...overrides}}},meta:{generatedAt:AT}};}
export function point(i,s=subject,price=String(100+i*2)){
 return receipt({version:'scout-offline-point/1',generatedAt:AT,kind:'actual_market_observation',mint:s.mint,poolMint:s.poolMint,quoteMint:s.quoteMint,observedAt:new Date(Date.parse(START)+i*3600000).toISOString(),priceQuote:price,liquidityUsd:'15000',volume24hUsd:'2000'},{fixture:true,url:'https://fixtures.invalid/points/'+s.mint});
}
export function input(fixture=false){return {version:'cards-research-input/1',context:fixture?'synthetic_offline_rehearsal':'public_source_inspection',asOf:AT,startAt:START,endAt:AT,registry:registry(fixture),subjects:[subject],captures:fixture?Array.from({length:25},(_,i)=>({subjectMint:MINT,receipt:point(i)})):[{subjectMint:MINT,receipt:receipt(snapshot())}]};}
