// OFFLINE ONLY test bundle. Never imported by Next app or a hosted route.
import React from 'react';
import {createRoot} from 'react-dom/client';
import Lens from '../../app/lens/view';
import type {JournalCapability} from '../../lib/v4-thesis-api/client-contract';
declare global{interface Window{__SYNTHETIC_CAPABILITY:JournalCapability}}
createRoot(document.getElementById('root')!).render(<><p style={{background:'#fff',color:'#111',font:'12px sans-serif',padding:8}}>LOCAL TEST · SYNTHETIC AUTH · LOCAL POSTGRES · SOURCES OFF</p><Lens journal={window.__SYNTHETIC_CAPABILITY}/></>);
