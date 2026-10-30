// LOCAL ONLY harness; uses the actual shipped view and real password/SQL gateway. Never imported by Next.
import React from 'react';import {createRoot} from 'react-dom/client';import CaLens from '../../app/lens/ca-view';
createRoot(document.getElementById('root')!).render(<><p style={{background:'#fff',color:'#111',fontSize:12,padding:8}}>LOCAL ONLY · INVENTED SOURCE RESPONSES · REAL PASSWORD/SQL/TLS · NOT A LIVE RESULT</p><CaLens previewAvailable/></>);
