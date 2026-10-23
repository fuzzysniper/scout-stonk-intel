import {ImageResponse} from 'next/og';
export const runtime='edge';
export const alt='UNFARMD · private creation observations · source authorization required';
export const size={width:1200,height:630};
export const contentType='image/png';
export default function Image(){
 return new ImageResponse(<div style={{display:'flex',width:'100%',height:'100%',background:'#191e18',color:'#e8e0cd',fontFamily:'sans-serif',padding:70,flexDirection:'column',justifyContent:'space-between'}}>
  <div style={{display:'flex',justifyContent:'space-between',fontSize:24}}><span>UNFARMD</span><span style={{color:'#cbb9a1',fontSize:18}}>PROPOSED LAUNCH BRAND · READ ONLY</span></div>
  <div style={{display:'flex',flexDirection:'column',gap:14}}><div style={{display:'flex',fontSize:76,fontWeight:700}}>Stop getting farmed.</div><div style={{display:'flex',fontSize:76,fontWeight:700,color:'#d2f65a'}}>Start scouting.</div></div>
  <div style={{display:'flex',flexDirection:'column',gap:10,fontSize:22,color:'#d5c2b0'}}><span>Private creation observations. Source authorization required.</span><span>Provisional / RPC-reported-finalized · partial coverage · no trading signals</span></div>
 </div>,size);
}
