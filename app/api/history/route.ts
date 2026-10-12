import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { isSolanaMint } from '../../../lib/solana';
import { summarizeHistory } from '../../../lib/history';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
 const values = request.nextUrl.searchParams.getAll('mint');
 const mint = values[0]?.trim() ?? '';
 if (values.length !== 1 || !isSolanaMint(mint)) {
  return NextResponse.json({ error: 'Invalid Solana mint address' }, { status: 400 });
 }
 try {
  const contents = await readFile(path.join(process.cwd(), 'data', 'reward-snapshots.json'), 'utf8');
  const store: unknown = JSON.parse(contents);
  if (store === null || typeof store !== 'object' || Array.isArray(store)) throw new Error('Invalid store');
  return NextResponse.json(summarizeHistory(store, mint), { headers: { 'Cache-Control': 'no-store' } });
 } catch {
  return NextResponse.json({ status: 'unavailable', error: 'Recorded reward history is unavailable', fetchedAt: new Date().toISOString() },
   { status: 503, headers: { 'Cache-Control': 'no-store' } });
 }
}
