import {ImageResponse} from 'next/og';
export const runtime='edge';
export const alt='Understand a Solana token · dated examples, not live data';
export const size={width:1200,height:630};
export const contentType='image/png';
export default function Image(){
 return new ImageResponse(<div style={{display:'flex',width:'100%',height:'100%',background:'#f7f8f4',color:'#192b36',fontFamily:'sans-serif',padding:80,flexDirection:'column',justifyContent:'space-between'}}>
  <div style={{display:'flex',fontSize:24,color:'#54646c'}}>DATED RESEARCH · READ ONLY</div>
  <div style={{display:'flex',flexDirection:'column',gap:20}}><div style={{display:'flex',fontSize:76,fontWeight:700}}>A token address.</div><div style={{display:'flex',fontSize:76,fontWeight:700,color:'#2844cc'}}>A clear answer.</div></div>
  <div style={{display:'flex',fontSize:25}}>Captured 14 Oct 2026 · Stale, not live data · Figures withheld</div>
 </div>,size);
}
