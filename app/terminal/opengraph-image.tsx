import { ImageResponse } from 'next/og';
export const runtime='edge';
export const alt='SCOUT — Follow the money. Independent Stonk ecosystem intelligence.';
export const size={width:1200,height:630};
export const contentType='image/png';
export default function Image(){
return new ImageResponse(<div style={{display:'flex',width:'100%',height:'100%',background:'linear-gradient(125deg,#08111c,#163735)',color:'#edf7f5',fontFamily:'sans-serif',padding:75,flexDirection:'column',justifyContent:'space-between'}}>
<div style={{display:'flex',alignItems:'center',gap:20}}><svg width="62" height="62" viewBox="0 0 62 62"><circle cx="31" cy="31" r="24" fill="none" stroke="#7be8c6" strokeWidth="5"/><circle cx="31" cy="31" r="12" fill="#7be8c6"/></svg><div style={{display:'flex',fontSize:58,fontWeight:900,letterSpacing:5}}>SCOUT<span style={{color:'#7be8c6'}}>.</span></div></div>
<div style={{display:'flex',flexDirection:'column',gap:20}}><div style={{fontSize:22,color:'#83e5c7',letterSpacing:5}}>STONK ECOSYSTEM INTELLIGENCE</div><div style={{fontSize:75,fontWeight:800,letterSpacing:-3}}>FOLLOW THE MONEY.</div><div style={{fontSize:29,color:'#b0c8c8'}}>Reward ledgers. Token dossiers. Evidence over hype.</div></div>
<div style={{display:'flex',justifyContent:'space-between',fontSize:18,color:'#9ab9b7'}}><span>PUBLIC ALPHA / READ ONLY</span><span>SCOUT.STORKCOIN.XYZ</span></div>
</div>,size);
}
