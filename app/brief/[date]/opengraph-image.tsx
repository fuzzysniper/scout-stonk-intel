import { ImageResponse } from 'next/og';
import { validBriefDate } from '../../../lib/brief';
export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'SCOUT daily research: provisional recorded evidence and coverage limitations';
export default async function Image({ params }: { params: Promise<{ date: string }> }) {
 const { date } = await params;
 const label = validBriefDate(date) ? date + ' UTC' : 'Date unavailable';
 return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between',padding:70,background:'#08171e',color:'#edf9f4',fontFamily:'sans-serif'}}><div style={{display:'flex',justifyContent:'space-between',fontSize:26,color:'#a4eacf'}}><span>SCOUT / DAILY RESEARCH</span><span>{label}</span></div><div style={{display:'flex',flexDirection:'column'}}><span style={{fontSize:70,fontWeight:700}}>Evidence for the daily read.</span><span style={{fontSize:30,marginTop:26,color:'#a5b8c2'}}>Recorded observations. Explicit coverage. Sources you can inspect.</span></div><div style={{display:'flex',fontSize:24,color:'#a4eacf'}}>PROVISIONAL EDITION | REVIEW THE DATED EVIDENCE</div></div>,size);
}
