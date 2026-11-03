// QA-only mount of the ACTUAL existing /lens native consumer. Never a new page.
import React from 'react';import {createRoot} from 'react-dom/client';
import NativeLens from '../../app/lens/native-lens';
createRoot(document.getElementById('root')!).render(<><p style={{position:'sticky',top:0,zIndex:10,background:'#f8faf8',color:'#111',fontSize:12,padding:8,margin:0}}>LOCAL / SYNTHETIC NATIVE EVIDENCE · NO LIVE ACQUISITION</p><NativeLens/></>);
