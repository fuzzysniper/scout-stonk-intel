/** Server-only, fixed-origin reader. No credentials, filesystem fallback, or writes. */
import { createHash, randomUUID } from 'node:crypto';
import { isSolanaMint } from './solana';
export const SNAPSHOT_URL = 'https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/reward-snapshots.json';
export const CACHE_MS = 5 * 60 * 1000;
export const RETRY_MS = 60 * 1000;
export const FALLBACK_MS = 15 * 60 * 1000;
export const MAX_BYTES = 2 * 1024 * 1024;
export type Dataset = {
 kind: 'github_snapshot'; source: string; revision: string | null;
 dataFetchedAt: string | null; sourceStatus: 'available' | 'cached' | 'degraded' | 'unavailable';
 cacheSeconds: number; continuouslyUpdated: false;
};
type Entry = { store: Record<string, unknown[]>; revision: string; fetched: number };
export type SourceResult = { store: Record<string, unknown[]> | null; dataset: Dataset };

export function createHistorySource(fetcher: typeof fetch = fetch, clock: () => number = () => Date.now()) {
 let entry: Entry | null = null;
 let retryAt = 0;
 let pending: Promise<SourceResult> | null = null;
 function result(status: Dataset['sourceStatus']): SourceResult {
  const retained = status !== 'unavailable' ? entry : null;
  return { store: retained?.store ?? null, dataset: {
   kind: 'github_snapshot', source: SNAPSHOT_URL, revision: retained?.revision ?? null,
   dataFetchedAt: retained ? new Date(retained.fetched).toISOString() : null,
   sourceStatus: status, cacheSeconds: CACHE_MS / 1000, continuouslyUpdated: false,
  } };
 }
 function failure(): SourceResult {
  return result(entry && clock() - entry.fetched <= FALLBACK_MS ? 'degraded' : 'unavailable');
 }
 async function refresh(): Promise<SourceResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
   // Each refresh uses a new CDN key; successful fetch time is never observation time.
   const response = await fetcher(SNAPSHOT_URL + '?scout_refresh=' + randomUUID(), {
    cache: 'no-store', redirect: 'error', signal: controller.signal,
    headers: { accept: 'application/json', 'cache-control': 'no-cache, no-store', pragma: 'no-cache' },
   });
   if (!response.ok || !response.body) throw new Error('Source unavailable');
   for (const header of ['age', 'source-age']) {
    const age = response.headers.get(header);
    if (age !== null && (!/^\d+$/.test(age) || Number(age) > CACHE_MS / 1000)) throw new Error('Stale transport');
   }
   if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Oversized source');
   const reader = response.body.getReader();
   const chunks: Uint8Array[] = []; let size = 0;
   try {
    while (true) {
     const { done, value } = await reader.read();
     if (done) break;
     size += value.byteLength;
     if (size > MAX_BYTES) throw new Error('Oversized source');
     chunks.push(value);
    }
   } finally { await reader.cancel(); }
   const bytes = Buffer.concat(chunks);
   const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
   if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid dataset');
   // Individual observation validation remains the calculator's responsibility.
   for (const [mint, rows] of Object.entries(parsed)) {
    if (!isSolanaMint(mint) || !Array.isArray(rows)) throw new Error('Invalid records');
   }
   entry = { store: parsed as Record<string, unknown[]>, revision: 'sha256:' + createHash('sha256').update(bytes).digest('hex'), fetched: clock() };
   retryAt = 0;
   return result('available');
  } catch {
   retryAt = clock() + RETRY_MS;
   return failure();
  } finally { clearTimeout(timer); controller.abort(); }
 }
 return async function read(): Promise<SourceResult> {
  if (retryAt > clock()) return failure();
  if (entry && clock() - entry.fetched < CACHE_MS) return result('cached');
  if (pending) return pending;
  pending = refresh();
  try { return await pending; } finally { pending = null; }
 };
}
// fetch is resolved per call so API tests can replace it without network access.
export const readHistorySource = createHistorySource((...args) => fetch(...args));
