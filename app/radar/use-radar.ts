'use client';
import { useEffect, useState } from 'react';
import type { RadarReport } from '../../lib/radar';

// Same bounded, no-store API and manual refresh behavior on Home and Radar.
export default function useRadar(sort: RadarReport['sort'] = 'coverage', quoteMint = '') {
 const [refresh, setRefresh] = useState(0);
 const [quoteOptions, setQuoteOptions] = useState<RadarReport['quotes']>([]);
 const [state, setState] = useState<{ report: RadarReport | null; loading: boolean; failed: boolean }>({ report: null, loading: true, failed: false });
 useEffect(() => {
  const controller = new AbortController();
  setState({ report: null, loading: true, failed: false });
  void fetch('/api/radar?sort=' + sort + (quoteMint ? '&quoteMint=' + encodeURIComponent(quoteMint) : ''), { cache: 'no-store', signal: controller.signal }).then(async response => {
   const report = await response.json() as RadarReport;
   if (!Array.isArray(report.rows) || !Array.isArray(report.quotes) || report.rows.some(row => !row.signals) || (!response.ok && response.status !== 503)) throw Error('Radar unavailable');
   if (!controller.signal.aborted) { setState({ report, loading: false, failed: false }); setQuoteOptions(report.quotes); }
  }).catch(() => { if (!controller.signal.aborted) setState({ report: null, loading: false, failed: true }); });
  return () => controller.abort();
 }, [sort, quoteMint, refresh]);
 return { ...state, quoteOptions, retry: () => setRefresh(value => value + 1) };
}
