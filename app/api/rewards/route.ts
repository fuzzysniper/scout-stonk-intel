import { NextRequest, NextResponse } from 'next/server';
import { isSolanaMint } from '../../../lib/solana';
export const runtime = 'nodejs';
type Ledger={mint?:string;mode?:string;message?:string;quote?:{mint?:string;symbol?:string};rewards?:{distributedTokens?:number;payoutCount?:number;holderCount?:number;lastPayoutAt?:string|null}|null};
export async function GET(request:NextRequest){
 const mint=request.nextUrl.searchParams.get('mint')?.trim()??'';
 if(!isSolanaMint(mint))return NextResponse.json({error:'Invalid Solana mint address'},{status:400});
 try{
  const url='https://www.stonkfun.xyz/api/public/v1/tokens/'+encodeURIComponent(mint)+'/rewards';
  const res=await fetch(url,{headers:{accept:'application/json'},next:{revalidate:60},signal:AbortSignal.timeout(8000)});
  if(res.status===404||res.status===400)return NextResponse.json({status:'not_found',fetchedAt:new Date().toISOString(),source:url});
  if(!res.ok)throw new Error('Upstream status '+res.status);
  const envelope:unknown=await res.json();
  const d=(envelope&&typeof envelope==='object'&&'data'in envelope)?(envelope as {data:unknown}).data:envelope;
  if(!d||typeof d!=='object')throw new Error('Unexpected ledger response');
  const v=d as Ledger;const rw=v.rewards;
  const safe=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0?n:null;
  return NextResponse.json({status:rw?'available':'no_rewards',mint,mode:typeof v.mode==='string'?v.mode:null,quoteSymbol:typeof v.quote?.symbol==='string'?v.quote.symbol:null,quoteMint:typeof v.quote?.mint==='string'?v.quote.mint:null,distributedTokens:safe(rw?.distributedTokens),payoutCount:safe(rw?.payoutCount),holderCount:safe(rw?.holderCount),lastPayoutAt:typeof rw?.lastPayoutAt==='string'?rw.lastPayoutAt:null,source:url,fetchedAt:new Date().toISOString(),message:typeof v.message==='string'?v.message:null});
 }catch{return NextResponse.json({status:'unavailable',error:'Reward ledger could not be verified',fetchedAt:new Date().toISOString()},{status:502});}
}
