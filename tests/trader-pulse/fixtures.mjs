// SYNTHETIC OFFLINE ONLY. None of these numbers, clocks or pool identities are live facts.
export const MINT='JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN';
export const QUOTE='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const OTHER='So11111111111111111111111111111111111111112';
export const AT=Date.parse('2026-10-20T12:00:00.000Z');
export const key=n=> '1'.repeat(31)+'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[n];
export const pool=(overrides={})=>({
 chainId:'solana',dexId:'synthetic-venue',pairAddress:key(1),
 baseToken:{address:MINT,name:'SYNTHETIC OFFLINE token',symbol:'OFFLINE'},
 quoteToken:{address:QUOTE,name:'SYNTHETIC quote',symbol:'OFFLINE'},
 liquidity:{usd:25000},volume:{m5:600,h1:6000,h6:12000,h24:30000},
 txns:{m5:{buys:30,sells:10},h1:{buys:180,sells:60},h6:{buys:300,sells:300},h24:{buys:500,sells:700}},
 priceUsd:'0.125',priceChange:{m5:4,h1:10,h6:-5,h24:0},pairCreatedAt:AT-3600000,
 ...overrides,
});
export const encode=value=>new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value));
export const approval=(overrides={})=>({purpose:'private_source_qualification',reference:'SYNTHETIC_OFFLINE_PERMISSION_NOT_LIVE',exactMints:[MINT],expiresMs:AT+3600000,maxRequests:3,sourceUseReviewed:true,publicRedistribution:false,...overrides});
export function response(body=[pool()],options={}) {
 const {url=`https://api.dexscreener.com/token-pairs/v1/solana/${MINT}`,redirected=false,...init}=options;
 const r=new Response(body===null?null:encode(body),{status:200,headers:{'content-type':'application/json'},...init});
 Object.defineProperties(r,{url:{value:url},redirected:{value:redirected}});return r;
}
