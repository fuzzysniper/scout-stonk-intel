import { NextRequest, NextResponse } from 'next/server';
import { readPairQuoteRegistry } from '../../../lib/pairs-source';
import { parsePairQuoteSearch, pairQuoteRegistryReport } from '../../../lib/pairs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(request:NextRequest) {
 const search=parsePairQuoteSearch(request.nextUrl.searchParams);
 if (!search)return NextResponse.json({error:'Invalid quote registry parameters'},{status:400,headers});
 try {
  const report=pairQuoteRegistryReport(await readPairQuoteRegistry(),search);
  return NextResponse.json(report,{status:report.status==='unavailable'?503:report.status==='not_found'?404:200,headers});
 } catch {
  const report=pairQuoteRegistryReport({value:null,sourceStatus:'unavailable'},search);
  return NextResponse.json({...report,error:'Quote registry temporarily unavailable'},{status:503,headers});
 }
}
