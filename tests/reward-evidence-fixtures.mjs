// Synthetic offline-only fixtures, never documentary evidence or application data.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const all=JSON.parse(readFileSync('data/tracked-mints.json','utf8'));
export const T=all.find(t=>t.symbol==='SI');
export const END=Date.parse('2030-01-03T00:00:00Z'),NOW=END+60_000,iso=t=>new Date(t).toISOString();
export function fixture(){
 const quote={mint:T.quoteMint,symbol:T.quoteSymbol,name:'Synthetic exact quote',decimals:8,tokenProgram:'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',symbolAmbiguous:false};
 const row={mint:T.mint,pool:T.poolMint,name:'Synthetic reward candidate',symbol:T.symbol,mode:'reward',quote:{mint:quote.mint,symbol:quote.symbol},market:{liquidityUsd:null,volume24hUsd:0}};
 const f={quote,rows:[row],status:200,mode:{mint:row.mint,mode:'reward',quote:{mint:quote.mint,symbol:quote.symbol,decimals:8},basis:'ledger',rewards:{distributedRaw:'10000000000',distributedTokens:100,payoutCount:10,walletsPaid:2,lastPayoutAt:iso(END)},base:null,generatedAt:iso(NOW)},now:NOW,calls:[],store:{[T.mint]:Array.from({length:49},(_,i)=>({observedAt:iso(END+(i-48)*3600000),providerGeneratedAt:iso(END+(i-48)*3600000-30000),distributedTokens:i+1,payoutCount:i+1,mode:'reward',quoteMint:T.quoteMint,quoteSymbol:T.quoteSymbol,source:T.source}))}};
 f.fetcher=async(url,options)=>{
  f.calls.push({url:String(url),options});const u=new URL(url);
  if(u.pathname==='/api/public/v1/pairs')return Response.json({data:{selectBy:'mint',ambiguousSymbolCount:0,pairs:[f.quote]},meta:{generatedAt:iso(f.now)}});
  if(u.pathname==='/api/public/v1/tokens')return Response.json({data:{network:'mainnet-beta',tokens:f.rows,pagination:{page:1,pageSize:25,total:f.rows.length,totalPages:Math.ceil(f.rows.length/25)}},meta:{generatedAt:iso(f.now)}});
  return Response.json({...f.mode,mint:u.pathname.split('/')[4]},{status:f.status});
 };
 f.history=()=>({store:f.store,dataset:{kind:'github_snapshot',source:'https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/reward-snapshots.json',revision:'sha256:'+createHash('sha256').update(JSON.stringify(f.store)).digest('hex'),dataFetchedAt:iso(f.now),sourceStatus:'available',cacheSeconds:300,continuouslyUpdated:false}});
 return f;
}
