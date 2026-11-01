// Local harness only; the real unchanged consumer entry, never a hosted route.
import React from 'react';import {createRoot} from 'react-dom/client';import CaLens from '../../app/lens/ca-view';
const native=new URLSearchParams(location.search).has('native');
createRoot(document.getElementById('root')!).render(<><p style={{background:'#f8faf8',color:'#111',fontSize:12,padding:8,margin:0}}>LOCAL / SYNTHETIC CLAIM DEMO · NO LIVE DATA OR OWNER AUTHENTICATION</p><CaLens marketPreviewAvailable previewAvailable={native} nativePreview={{available:native,mints:['DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP'],windowActive:true}}/></>);
