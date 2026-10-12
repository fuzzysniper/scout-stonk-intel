import type { Metadata } from 'next';
import ScoutClient from './scout-client';
import { isSolanaMint } from '../lib/solana';

export async function generateMetadata({searchParams}:{searchParams:Promise<{mint?:string}>}):Promise<Metadata>{
 const {mint}=await searchParams;
 if(!mint||!isSolanaMint(mint))return {};
 const image='/api/og?mint='+encodeURIComponent(mint);
 return {
  title:'SCOUT — Token Intelligence Dossier',
  openGraph:{title:'SCOUT — Token Intelligence Dossier',images:[{url:image,width:1200,height:630}]},
  twitter:{card:'summary_large_image',title:'SCOUT — Token Intelligence Dossier',images:[image]},
 };
}
export default function Page(){return <ScoutClient/>;}
