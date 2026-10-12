import { NextRequest, NextResponse } from 'next/server';
import { isSolanaMint } from '../../../lib/solana';
import { summarizeHistory } from '../../../lib/history';
import { readHistorySource } from '../../../lib/history-source';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
 const values = request.nextUrl.searchParams.getAll('mint');
 const mint = values[0]?.trim() ?? '';
 if (values.length !== 1 || !isSolanaMint(mint)) {
  return NextResponse.json({ error: 'Invalid Solana mint address' }, { status: 400 });
 }
 const { store, dataset } = await readHistorySource();
 if (!store) return NextResponse.json({ status: 'unavailable', error: 'Recorded reward history is unavailable',
  fetchedAt: new Date().toISOString(), latestObservedAt: null, dataFetchedAt: null, dataset },
  { status: 503, headers: { 'Cache-Control': 'no-store' } });
 const report = summarizeHistory(store, mint);
 if (dataset.sourceStatus === 'degraded') {
  for (const window of Object.values(report.windows)) {
   window.status = 'source_unavailable'; window.distributedTokens = null;
  }
 }
 return NextResponse.json({ ...report, dataset, dataFetchedAt: dataset.dataFetchedAt },
  { headers: { 'Cache-Control': 'no-store' } });
}
