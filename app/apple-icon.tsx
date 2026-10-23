import {ImageResponse} from 'next/og';
import {OUTLIER_PATH} from './consumer/brand/outlier-mark';
export const size={width:180,height:180};
export const contentType='image/png';
/** Generated statically by Next; the OS applies its own rounded app-icon mask. */
export default function AppleIcon(){return new ImageResponse(
 <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#191e18'}}>
  <svg viewBox="0 0 64 64" width="180" height="180"><path d={OUTLIER_PATH} fill="#e8e0cd"/></svg>
 </div>,size);
}
