// LOCAL/SYNTHETIC ONLY; build on #273's actual original offline byte projection, not a live receipt.
import {scenario,MINT} from '../oracle-claim-266/fixtures.mjs';
export {MINT};
export async function takeScenario(mode='activity',now=Date.now()){
 const from={warning:'contradicted','provider-warning':'provider-negative',conflict:'conflict',snapshot:'supported',stale:'stale','old-warning':'provider-negative'}[mode]??'provider';
 const v=await scenario(from,now);v.name='LOCAL TAKE FIXTURE';v.symbol='TEST';
 for(const p of ['5m','1h','24h'])v.windows[p]=v.windows[p].map(f=>({...f,path:f.id===p+'-buys'?'stats'+p+'.numBuys':f.path}));
 if(['unknown','source-off','snapshot','score-only'].includes(mode)){
  const blank=f=>({...f,value:null,status:'unknown',source:null,observedAt:null,receivedAt:null,path:null,responseSha256:null,captureKind:null});
  v.facts=v.facts.map(blank);v.controls=v.controls.map(blank);v.windows={'5m':[],'1h':[],'24h':[]};
  if(mode!=='snapshot')v.riskFindings=v.riskFindings.map(f=>mode==='score-only'&&f.id==='organic'?f:{...f,tone:'gray',value:null,fieldPath:null,source:null,observedAt:null,responseSha256:null});
 }
 if(['source-off','unknown','snapshot'].includes(mode)){v.identity='unverified';v.name=null;v.symbol=null;v.identityNote='LOCAL/SYNTHETIC identity is unverified; no genuine mint observation.';}
 if(mode==='source-off')v.state='sources_off';
 if(mode==='old-warning')v.riskFindings=v.riskFindings.map(f=>f.tone==='red'?{...f,observedAt:new Date(now-120000).toISOString()}:f);
 return v;
}
