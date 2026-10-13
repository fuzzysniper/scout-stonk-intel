import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { validBriefDate } from '../../../../../lib/brief';
import { hex } from '../../../../../lib/archive';
import BriefClient from '../../../brief-client';
export const dynamic='force-dynamic';
type Props={params:Promise<{date:string;id:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {date,id}=await params,path='/brief/'+date+'/editions/'+id;
 return {title:`SCOUT Archived Edition — ${date} UTC`,description:'Exact finalized research edition with preserved evidence. Corrections are separate editions.',alternates:{canonical:path},openGraph:{title:`SCOUT Archived Edition — ${date} UTC`,description:'Finalized edition. Preserved observations and coverage limitations.',url:path,images:[{url:path+'/opengraph-image'}]},twitter:{card:'summary_large_image'}};
}
export default async function Page({params}:Props){const {date,id}=await params;if(!validBriefDate(date)||!hex(id))notFound();return <BriefClient date={date} archiveId={id} invalidQuery={false}/>;}
