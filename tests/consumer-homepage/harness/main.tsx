// Local test entry only. Never imported by app/, public/ or a Next route.
import React from 'react';
import {createRoot} from 'react-dom/client';
import ConsumerHome from '../../../app/consumer/home';
import {evaluateInput} from '../../../app/consumer/model';
import type {MintFactsPort,MintReadOutcome} from '../../../app/consumer/onchain-client';
import {syntheticMint,syntheticFailure,syntheticProductionEnvelope,TEST_MINT} from '../synthetic';
import '../../../app/globals.css';
import '../../../app/consumer/consumer.css';
import './test.css';
const params=new URL(location.href).searchParams,mint=params.get('mint')??TEST_MINT,scenario=params.get('scenario')??'verified';
let reads=0;
const unavailableMarket=async()=>({state:'unavailable' as const,retryAt:Infinity});
const port:MintFactsPort={context:scenario.startsWith('production-')?'production':'synthetic-offline',read:async address=>{
 reads++;document.documentElement.dataset.reads=String(reads);
 if(scenario==='loading')return new Promise<MintReadOutcome>(resolve=>{Object.assign(window,{resolveOfflineReadiness:()=>resolve({httpStatus:503,body:syntheticFailure(address)})});});
 if(scenario==='race'&&address===TEST_MINT)await new Promise(r=>setTimeout(r,250));
 if(scenario==='rate')return {httpStatus:429,body:syntheticFailure(address,'rate_limited'),retryMs:2000};
 if(scenario==='unsupported')return {httpStatus:404,body:syntheticFailure(address,'not_mint','not_a_supported_mint_account')};
 if(scenario==='network')throw Error('Synthetic transport interruption');
 if(scenario==='disabled')return {httpStatus:503,body:syntheticFailure(address)};
 if(scenario==='denied')return {httpStatus:403,body:syntheticFailure(address,'access_denied')};
 // Simulates the production discriminator OFFLINE, without fetching the API or Helius.
 // The permanent outer harness warning remains visible in every screenshot/state.
 if(scenario==='production-profile'||scenario==='production-extensions')return {httpStatus:200,body:syntheticProductionEnvelope(address,scenario==='production-extensions')};
 if(scenario==='production-synthetic')return {httpStatus:200,body:syntheticMint(address)};
 let value=syntheticMint(address,scenario==='extensions');
 if(value.status==='verified_onchain_mint_at_slot'||value.status==='unsupported_extensions'){
  // A new fictional capture ONLY when the user explicitly retries in the local harness.
  // The application never manufactures capture clocks or renews a cached observation.
  if(scenario==='recover'){const captured=new Date(Date.now()).toISOString();value={...value,source:{...value.source,requestStartedAt:captured,responseReceivedAt:captured,checkedAt:captured,evaluatedAt:captured}};}
  if(scenario==='expired')value={...value,source:{...value.source,checkedAt:'2026-10-18T11:00:00.000Z',requestStartedAt:'2026-10-18T11:00:00.000Z',responseReceivedAt:'2026-10-18T11:00:00.000Z',evaluatedAt:'2026-10-18T11:00:00.000Z'}};
  if(scenario==='malformed')value={...value,facts:{...value.facts,supply:{...value.facts.supply,raw:'not-a-number'}}};
 }
 return {httpStatus:200,body:value};
}};
createRoot(document.getElementById('root')!).render(<><div className="test-only-notice">LOCAL SYNTHETIC/OFFLINE HARNESS · no RPC · not a deployed page</div><ConsumerHome initialInput={mint} initialState={evaluateInput(mint)} onchainPort={port} marketPort={unavailableMarket}/></>);
