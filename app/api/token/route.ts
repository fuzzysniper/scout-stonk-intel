import { NextRequest, NextResponse } from 'next/server';
import { isSolanaMint } from '../../../lib/solana';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const mint = request.nextUrl.searchParams.get('mint')?.trim() ?? '';
  if (!isSolanaMint(mint)) return NextResponse.json({ error: 'Invalid Solana mint address' }, { status: 400 });
  try {
    const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + encodeURIComponent(mint), { next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return NextResponse.json({ error: 'Market data temporarily unavailable' }, { status: 502 });
    const data: unknown = await response.json();
    const pairs = (data && typeof data === 'object' && 'pairs' in data && Array.isArray(data.pairs)) ? data.pairs : [];
    const matches = pairs.filter((p: any) => p?.chainId === 'solana' && (p?.baseToken?.address === mint || p?.quoteToken?.address === mint));
    const ranked = matches.sort((a: any,b: any) => (Number(b?.liquidity?.usd)||0)-(Number(a?.liquidity?.usd)||0));
    const p = ranked[0];
    if (!p) return NextResponse.json({ mint, found: false, source: 'DexScreener', fetchedAt: new Date().toISOString() });
    return NextResponse.json({ mint, found: true, source: 'DexScreener', fetchedAt: new Date().toISOString(), dex: String(p.dexId||''), pairAddress: String(p.pairAddress||''), pairUrl: typeof p.url==='string'?p.url:null, base: { symbol: String(p.baseToken?.symbol||''), name: String(p.baseToken?.name||''), address: String(p.baseToken?.address||'') }, quote: { symbol: String(p.quoteToken?.symbol||''), address: String(p.quoteToken?.address||'') }, priceUsd: p.baseToken?.address===mint && p.priceUsd!=null ? String(p.priceUsd):null, liquidityUsd: Number.isFinite(Number(p.liquidity?.usd))?Number(p.liquidity.usd):null, volume24h: Number.isFinite(Number(p.volume?.h24))?Number(p.volume.h24):null, change24h: Number.isFinite(Number(p.priceChange?.h24))?Number(p.priceChange.h24):null, marketCap: Number.isFinite(Number(p.marketCap))?Number(p.marketCap):null, note: 'Highest reported liquidity Solana pool, not necessarily StonkFun. Reward distribution data not yet integrated.' });
  } catch { return NextResponse.json({ error: 'Market data request failed. Try again later.' }, { status: 502 }); }
}
