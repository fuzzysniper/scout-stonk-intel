// Explicit synthetic offline provider fixtures. Never application data or screenshots.
import fs from 'node:fs/promises';
const tracked=JSON.parse(await fs.readFile(new URL('../data/tracked-mints.json',import.meta.url)));
export const AT=Date.parse('2030-01-01T12:00:00Z');
export const T=tracked.find(t=>t.symbol==='KNOTS'), OTHER=tracked.find(t=>t.symbol==='SI');
const PROGRAM='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export function quote(mint=T.quoteMint,symbol=T.quoteSymbol) {return {mint,symbol,name:'Synthetic quote',decimals:9,tokenProgram:PROGRAM,symbolAmbiguous:true};}
export function registry(quotes=[quote(),quote(OTHER.quoteMint,'NVDAX')],now=AT) {
 return {data:{selectBy:'mint',pairs:quotes},meta:{generatedAt:new Date(now).toISOString()}};
}
export function token(mint=T.mint,quoteMint=T.quoteMint,quoteSymbol=T.quoteSymbol) {
 return {mint,pool:T.poolMint,name:'Synthetic test token',symbol:'TEST',mode:'reward',quote:{mint:quoteMint,symbol:quoteSymbol},market:{priceUsd:0,liquidityUsd:null,volume24hUsd:12}};
}
export function page(tokens=[token()],number=1,total=1,now=AT) {
 return {data:{network:'mainnet-beta',tokens,pagination:{page:number,pageSize:25,total,totalPages:Math.ceil(total/25)}},meta:{generatedAt:new Date(now).toISOString()}};
}
export function reward(t=token(),now=AT) {
 return {mint:t.mint,mode:t.mode,quote:t.quote,basis:'awaiting-snapshot',rewards:null,generatedAt:new Date(now).toISOString()};
}
export function address(i) {
 const chars='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
 let n=(7n<<248n)+BigInt(i+1),s='';while(n){s=chars[Number(n%58n)]+s;n/=58n;}return s;
}
export function sourceGraph({quotes,rows=[token()],total=rows.length,now=()=>AT,modeTransform=x=>x}={}) {
 const calls=[];
 const fetcher=async (url,options)=>{
  calls.push({url:String(url),options});
  if(String(url).endsWith('/pairs'))return Response.json(registry(quotes,now()));
  const u=new URL(url);
  if(u.pathname==='/api/public/v1/tokens') {
   const index=Number(u.searchParams.get('page'));
   return Response.json(page(rows.slice((index-1)*25,index*25),index,total,now()));
  }
  const mint=u.pathname.split('/')[4],found=rows.find(t=>t.mint===mint);
  if(found)return Response.json(modeTransform(reward(found,now())));
  throw Error('synthetic source not configured');
 };
 return {fetcher,calls};
}
export function history(store={},status='available') {
 return {store:status==='unavailable'?null:store,dataset:{kind:'github_snapshot',source:'https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/reward-snapshots.json',revision:'sha256:synthetic-test-only',dataFetchedAt:status==='unavailable'?null:new Date(AT).toISOString(),sourceStatus:status,cacheSeconds:300,continuouslyUpdated:false}};
}
export function point(time=AT) {
 return {observedAt:new Date(time).toISOString(),distributedTokens:2,payoutCount:2,quoteMint:T.quoteMint,quoteSymbol:T.quoteSymbol,source:T.source,mode:'reward'};
}
