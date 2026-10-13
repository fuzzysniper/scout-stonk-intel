import { ImageResponse } from 'next/og';
import { validBriefDate } from '../../../../../lib/brief';
import { hex } from '../../../../../lib/archive';
export const runtime='nodejs';
export const size={width:1200,height:630};
export const contentType='image/png';
export const alt='SCOUT archived research edition: preserved recorded evidence';
export default async function Image({params}:{params:Promise<{date:string;id:string}>}){
 const {date,id}=await params;
 return new ImageResponse(<div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',width:'100%',height:'100%',padding:70,background:'#08171e',color:'#edf9f4',fontFamily:'sans-serif'}}><div style={{display:'flex',justifyContent:'space-between',fontSize:28,color:'#a4eacf'}}><span>SCOUT / ARCHIVED EDITION</span><span>{validBriefDate(date) ? date : 'Date unavailable'} UTC</span></div><div style={{display:'flex',flexDirection:'column'}}><span style={{fontSize:68,fontWeight:700}}>Evidence, preserved.</span><span style={{fontSize:30,marginTop:24}}>Recorded observations. Explicit coverage. No invented findings.</span></div><div style={{display:'flex',fontSize:24,color:'#a4eacf'}}>EDITION {hex(id)?id.slice(0,20):'UNAVAILABLE'} | CORRECTIONS REMAIN SEPARATE</div></div>,size);
}
