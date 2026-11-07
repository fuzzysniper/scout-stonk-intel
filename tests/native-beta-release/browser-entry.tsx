import React from 'react';import {createRoot} from 'react-dom/client';import NativeLens from '../../app/lens/native-lens';
createRoot(document.getElementById('root')!).render(<><p style={{background:'#eef4ee',color:'#111',padding:8,fontSize:12}}>LOCAL / SYNTHETIC UI QA · OWNER + SOURCE OFF · NO LIVE DATA</p><NativeLens ownerAccess/></>);
