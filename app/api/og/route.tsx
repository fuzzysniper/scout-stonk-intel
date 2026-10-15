import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { isSolanaMint } from '../../../lib/solana';
export const runtime='edge';
const noStore={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const finite=(value:unknown):value is number=>typeof value==='number' && Number.isFinite(value) && value>=0;
// Use the bundled Latin font. Unsupported labels fall back to the exact mint,
// rather than requesting remote fonts or guessing a different token identity.
function label(value:unknown,max:number):string|null {
 return typeof value==='string' && /^[\x20-\x7e]+$/.test(value) && value.trim()?value.trim().slice(0,max):null;
}
function fetched(value:unknown):string {
 if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}T/.test(value))return 'time unavailable';
 const time=Date.parse(value);return Number.isFinite(time) && time<=Date.now()+60_000?new Date(time).toISOString().slice(0,16).replace('T',' ')+' UTC':'time unavailable';
}
async function source(url:string):Promise<Record<string,unknown>|null> {
 try {
  const response=await fetch(url,{method:'GET',redirect:'error',cache:'no-store',headers:{accept:'application/json'},signal:AbortSignal.timeout(6500)});
  if(!response.ok || !response.body || Number(response.headers.get('content-length'))>65536)return null;
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  try {while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>65536)return null;chunks.push(part.value);}}
  finally {void reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
  const value:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  return value && typeof value==='object' && !Array.isArray(value)?value as Record<string,unknown>:null;
 }catch{return null;}
}
export async function GET(req:NextRequest){
 const params=req.nextUrl.searchParams,mints=params.getAll('mint'),mint=mints[0]??'';
 if(mints.length!==1 || [...params.keys()].some(k=>k!=='mint') || !isSolanaMint(mint))return new Response('Invalid mint',{status:400,headers:noStore});
 const origin=req.nextUrl.origin;
 const [market,reward]=await Promise.all([source(origin+'/api/token?mint='+encodeURIComponent(mint)),source(origin+'/api/rewards?mint='+encodeURIComponent(mint))]);
 // Same-origin API contracts identify the requested token; never label another
 // base token when DexScreener matched this mint on the quote side of a pool.
 const m=market?.mint===mint?market:null,r=reward?.mint===mint?reward:null;
 if(!m && !r && !(reward?.status==='not_found' && reward.mint===undefined))return new Response('Social preview temporarily unavailable',{status:503,headers:{...noStore,'Retry-After':'60'}});
 let symbol='TOKEN',quote='—',distributed:string|null=null,holders:string|null=null,liquidity:string|null=null;
 let marketStamp='Market source unavailable',rewardStamp='Reward source unavailable';
 if(m?.found){
  const base=m.base as {address?:unknown;symbol?:unknown}|undefined,q=m.quote as {address?:unknown;symbol?:unknown}|undefined;
  if(base?.address===mint || q?.address===mint){
   symbol=label(base?.address===mint?base.symbol:q?.symbol,16)??'TOKEN';quote=label(base?.address===mint?q?.symbol:base?.symbol,12)??'—';
   if(finite(m.liquidityUsd))liquidity='$'+new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(m.liquidityUsd);
   marketStamp='Market fetched: '+fetched(m.fetchedAt);
  }
 }
 if(r?.status==='available' && r.mode==='reward' && typeof r.quoteMint==='string' && isSolanaMint(r.quoteMint)){
  const unit=label(r.quoteSymbol,12);
  if(unit){quote=unit;if(finite(r.distributedTokens))distributed=new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(r.distributedTokens)+' '+unit;}
  if(finite(r.holderCount) && Number.isSafeInteger(r.holderCount))holders=new Intl.NumberFormat('en-US').format(r.holderCount);
  rewardStamp='Reward fetched: '+fetched(r.fetchedAt);
 }
 try {
  const image=new ImageResponse(<div style={{display:'flex',width:'100%',height:'100%',background:'linear-gradient(130deg,#09111c,#15332f)',color:'#f0f7f5',padding:65,fontFamily:'sans-serif',flexDirection:'column',justifyContent:'space-between'}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{display:'flex',alignItems:'center',fontSize:48,fontWeight:900,letterSpacing:3}}>SCOUT<span style={{color:'#83edc5'}}>.</span></div><div style={{display:'flex',fontSize:19,color:'#9de6cf'}}>TOKEN DOSSIER / READ ONLY</div></div>
   <div style={{display:'flex',flexDirection:'column',gap:18}}><div style={{display:'flex',fontSize:54,fontWeight:850}}>{symbol}<span style={{color:'#9bb7b4'}}>&nbsp;/ {quote}</span></div><div style={{display:'flex',fontSize:19,color:'#9ed3c5'}}>LIFETIME REWARDS · REPORTED BY STONKFUN</div><div style={{display:'flex',fontSize:70,fontWeight:850,color:'#86efc8'}}>{distributed??'Not available'}</div><div style={{display:'flex',gap:35,fontSize:21,color:'#d3e1df'}}><span>Provider holder count: {holders??'—'}</span><span>Liquidity (market pool): {liquidity??'—'}</span></div></div>
   <div style={{display:'flex',flexDirection:'column',gap:8,color:'#9cb8b3',fontSize:14}}><span>Mint: {mint}</span><span>{rewardStamp} · {marketStamp}</span><span>Not holder profit or APR · Not onchain reconciled · SCOUT.STORKCOIN.XYZ</span></div>
  </div>,{width:1200,height:630});
  // Satori errors occur while consuming the stream, after the constructor.
  // Buffer before returning headers so a renderer failure is a controlled 503.
  const bytes=await image.arrayBuffer();
  return new Response(bytes,{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=60, s-maxage=60','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response('Social preview temporarily unavailable',{status:503,headers:{...noStore,'Retry-After':'60'}});}
}
