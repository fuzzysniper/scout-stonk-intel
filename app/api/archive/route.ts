import { NextRequest,NextResponse } from 'next/server';
import { validBriefDate } from '../../../lib/brief';
import { hex,ARCHIVE_ROOT } from '../../../lib/archive';
import { readArchived,readArchiveIndex } from '../../../lib/archive-source';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 const p=request.nextUrl.searchParams,date=p.get('date'),id=p.get('id'),headers={'Cache-Control':'no-store'};
 if(p.getAll('date').length!==1||p.getAll('id').length>1||!date||!validBriefDate(date)||(id!==null&&!hex(id))||[...p.keys()].some(k=>k!=='date'&&k!=='id'))return NextResponse.json({error:'Invalid archive date or edition'},{status:400,headers});
 const result=await readArchived(date,id??undefined);
 if(!result.report)return NextResponse.json({status:result.state,error:result.state==='absent'?'No approved edition at this address':'Archive evidence unavailable; no provisional replacement is served'},{status:result.state==='absent'?404:503,headers});
 const editionId=result.report.publication!.id;
 return NextResponse.json({report:result.report,edition:result.edition,evidence:ARCHIVE_ROOT+'/'+date+'/'+editionId+'.json',indexSource:(await readArchiveIndex()).dataset},{headers});
}
