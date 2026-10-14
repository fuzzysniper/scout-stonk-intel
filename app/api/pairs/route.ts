import { NextRequest, NextResponse } from 'next/server';
import { isSolanaMint } from '../../../lib/solana';
import { readHistorySource, SNAPSHOT_URL } from '../../../lib/history-source';
import { readPairSource, readScopedPairSource } from '../../../lib/pairs-source';
import { pairCatalogReport } from '../../../lib/pairs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(request:NextRequest) {
 const params=request.nextUrl.searchParams,quotes=params.getAll('quoteMint'),discovery=params.getAll('discovery');
 if([...params.keys()].some(k=>k!=='quoteMint' && k!=='discovery') || quotes.length>1 ||
    (quotes.length===1 && !isSolanaMint(quotes[0])) || discovery.length>1 ||
    (discovery.length===1 && (discovery[0]!=='pair' || quotes.length!==1))) {
  return NextResponse.json({error:'Invalid pair catalog parameters'},{status:400,headers});
 }
 try {
  const [catalog,history]=await Promise.all([discovery.length ? readScopedPairSource(quotes[0]) : readPairSource(),readHistorySource()]);
  const report=pairCatalogReport(catalog,history,new Date(),quotes[0]??null);
  if(catalog.value && quotes.length && !catalog.value.quotes.some(q=>q.mint===quotes[0])) {
   return NextResponse.json({...report,status:'not_found',error:'Quote mint not in verified registry'},{status:404,headers});
  }
  return NextResponse.json(report,{status:report.status==='unavailable'?503:200,headers});
 } catch {
  const report=pairCatalogReport({value:null,sourceStatus:'unavailable'},{store:null,dataset:{kind:'github_snapshot',source:SNAPSHOT_URL,revision:null,dataFetchedAt:null,sourceStatus:'unavailable',cacheSeconds:300,continuouslyUpdated:false}});
  return NextResponse.json({...report,error:'Pair catalog temporarily unavailable'},{status:503,headers});
 }
}
