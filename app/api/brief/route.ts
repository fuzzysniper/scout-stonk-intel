import { NextRequest, NextResponse } from 'next/server';
import { validBriefDate } from '../../../lib/brief';
import { readArchived } from '../../../lib/archive-source';
import { readBrief } from '../../../lib/brief-source';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
 const params = request.nextUrl.searchParams, dates = params.getAll('date'), versions = params.getAll('v'), now = new Date();
 const date = dates[0] ?? now.toISOString().slice(0,10), version = versions[0];
 const headers = { 'Cache-Control': 'no-store' };
 if (dates.length > 1 || versions.length > 1 || [...params.keys()].some(key => key !== 'date' && key !== 'v') ||
  !validBriefDate(date, now) || (version !== undefined && !/^[a-f0-9]{64}$/.test(version))) return NextResponse.json({ error: 'Invalid brief date or version' }, { status: 400, headers });
 try {
  const archived=await readArchived(date,version);
  if(archived.report)return NextResponse.json(archived.report,{headers});
  const original=version?await readArchived(date):archived;
  if(original.report && version)return NextResponse.json({status:'revision_changed',error:'Requested version is not an approved edition. Original archive remains unchanged.',canonicalPath:original.report.sharePath},{status:409,headers});
  if(original.state==='unavailable' && date<now.toISOString().slice(0,10))return NextResponse.json({error:'Indexed archive evidence unavailable; no provisional replacement'},{status:503,headers});
  const brief = await readBrief(date, now);
  if (brief.dataset.sourceStatus === 'unavailable') return NextResponse.json(brief, { status: 503, headers });
  if (version !== undefined && brief.version !== version) return NextResponse.json({ status: 'revision_changed', error: 'The shared provisional version is no longer available. Open the current brief explicitly.',
   date, requestedVersion: version, currentVersion: brief.version, canonicalPath: brief.canonicalPath }, { status: 409, headers });
  return NextResponse.json(brief, { headers });
 } catch {
  return NextResponse.json({ error: 'Brief evidence could not be verified', status: 'unavailable' }, { status: 503, headers });
 }
}
