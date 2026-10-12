import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { isSolanaMint } from '../../../lib/solana';
export const runtime='edge';
export async function GET(req:NextRequest){
 const mint=req.nextUrl.searchParams.get('mint')??'';
 if(!isSolanaMint(mint))return new Response('Invalid mint',{status:400});
 const origin=req.nextUrl.origin;
 let symbol='TOKEN',quote='—',distributed:string|null=null,holders:string|null=null,liquidity:string|null=null,stamp='Data unavailable';
 try{
  const [m,r]=await Promise.allSettled([fetch(origin+'/api/token?mint='+encodeURIComponent(mint),{signal:AbortSignal.timeout(6500)}).then(x=>x.ok?x.json():null),fetch(origin+'/api/rewards?mint='+encodeURIComponent(mint),{signal:AbortSignal.timeout(6500)}).then(x=>x.ok?x.json():null)]);
  if(m.status==='fulfilled'&&m.value?.found){const v=m.value;symbol=String(v.base?.symbol||'TOKEN').slice(0,16);quote=String(v.quote?.symbol||'—').slice(0,12);if(typeof v.liquidityUsd==='number')liquidity='$'+new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(v.liquidityUsd);}
  if(r.status==='fulfilled'&&r.value?.status==='available'){const v=r.value;if(typeof v.distributedTokens==='number'){distributed=new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(v.distributedTokens)+' '+String(v.quoteSymbol||'quote').slice(0,12);}if(typeof v.holderCount==='number')holders=new Intl.NumberFormat('en-US').format(v.holderCount);}
  stamp='API-reported · '+new Date().toISOString().slice(0,16).replace('T',' ')+' UTC';
 }catch{}
 return new ImageResponse(<div style={{display:'flex',width:'100%',height:'100%',background:'linear-gradient(130deg,#09111c,#15332f)',color:'#f0f7f5',padding:65,fontFamily:'sans-serif',flexDirection:'column',justifyContent:'space-between'}}>
 <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontSize:48,fontWeight:900,letterSpacing:3}}>◉ SCOUT<span style={{color:'#83edc5'}}>.</span></div><div style={{fontSize:19,color:'#9de6cf'}}>TOKEN DOSSIER / READ ONLY</div></div>
 <div style={{display:'flex',flexDirection:'column',gap:18}}><div style={{fontSize:54,fontWeight:850}}>{symbol} <span style={{color:'#9bb7b4'}}>/ {quote}</span></div><div style={{fontSize:19,color:'#9ed3c5'}}>LIFETIME REWARDS · REPORTED BY STONKFUN</div><div style={{fontSize:70,fontWeight:850,color:'#86efc8'}}>{distributed??'Not available'}</div><div style={{display:'flex',gap:35,fontSize:23,color:'#d3e1df'}}><span>Eligible holders: {holders??'—'}</span><span>Liquidity: {liquidity??'—'}</span></div></div>
 <div style={{display:'flex',flexDirection:'column',gap:8,color:'#9cb8b3',fontSize:16}}><span>{stamp} · Not holder profit or APR · Not onchain reconciled</span><span>SCOUT.STORKCOIN.XYZ · FOLLOW THE MONEY</span></div></div>,{width:1200,height:630});
}
