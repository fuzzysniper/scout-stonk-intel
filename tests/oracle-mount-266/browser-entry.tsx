// Loopback INVENTED/TEST harness only. Never a source authority or a hosted entry.
import React from 'react';import {createRoot} from 'react-dom/client';import CaLens from '../../app/lens/ca-view';
const native=new URLSearchParams(location.search).has('native');
createRoot(document.getElementById('root')!).render(<><p style={{background:'#f8faf8',color:'#111',fontSize:12,padding:8,margin:0}}>LOCAL UI FIXTURES · INVENTED EVIDENCE · NO LIVE PROVIDER DATA</p><CaLens previewAvailable={native} marketPreviewAvailable nativePreview={{available:native,mints:['So11111111111111111111111111111111111111112'],windowActive:true}}/></>);
