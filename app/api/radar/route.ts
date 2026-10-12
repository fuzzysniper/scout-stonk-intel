import { NextRequest, NextResponse } from 'next/server';
import { readHistorySource } from '../../../lib/history-source';
import { trackedTokens } from '../../../lib/tracked-tokens';
import { summarizeRadar } from '../../../lib/radar';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
 const sorts = request.nextUrl.searchParams.getAll('sort');
 const sort = sorts[0] ?? 'coverage';
 const quotes = request.nextUrl.searchParams.getAll('quoteMint');
 if (sorts.length > 1 || (sort !== 'name' && sort !== 'freshness' && sort !== 'coverage')) return NextResponse.json({ error: 'Invalid radar sort' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
 try {
  const tokens = trackedTokens();
  if (quotes.length > 1 || (quotes.length === 1 && !tokens.some(token => token.quoteMint === quotes[0]))) return NextResponse.json({ error: 'Invalid quote filter' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  const { store, dataset } = await readHistorySource();
  const report = summarizeRadar(store, tokens, dataset, sort, new Date(), quotes[0] ?? null);
  return NextResponse.json(report, { status: report.status === 'unavailable' ? 503 : 200, headers: { 'Cache-Control': 'no-store' } });
 } catch {
  return NextResponse.json({ status: 'unavailable', error: 'Radar configuration is unavailable', fetchedAt: new Date().toISOString() }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
 }
}
