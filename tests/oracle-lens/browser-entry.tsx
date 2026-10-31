// Loopback UI harness only. NEVER imported by the Next app or a hosted route.
import React from 'react';import {createRoot} from 'react-dom/client';import CaLens from '../../app/lens/ca-view';
createRoot(document.getElementById('root')!).render(<><p style={{background:'#f8faf8',color:'#111',fontSize:12,padding:8,margin:0}}>LOCAL UI FIXTURES · INVENTED EVIDENCE · NO LIVE PROVIDER DATA</p><CaLens/></>);
