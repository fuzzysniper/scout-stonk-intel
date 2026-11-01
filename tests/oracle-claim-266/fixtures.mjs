// LOCAL SYNTHETIC CLAIM DEMONSTRATION ONLY. No authenticated native receipt or acquisition.
import {ownerShape} from '../oracle-v5/fixtures.mjs';
import {capture,base,rpc,decodeOnchainCapture,projectOnchainRisk,MINT,OTHER} from '../v4-oracle-onchain/fixtures.mjs';
export {MINT};
const JUPITER_HASH='b'.repeat(64);
export async function scenario(mode='provider',now=Date.now()){
 const clock=new Date(now-(mode==='stale'?120000:1000)).toISOString(),view=ownerShape(MINT);
 view.name='LOCAL CLAIM FIXTURE';view.symbol='TEST';view.state='offline_fixture';
 view.identityNote='LOCAL SYNTHETIC bytes/reports only. No live source or genuine owner receipt.';
 const fact=f=>f.value===null?f:{...f,source:'Jupiter Tokens V2 · SYNTHETIC fixture',observedAt:clock,receivedAt:clock,responseSha256:JUPITER_HASH,status:mode==='stale'?'stale':'reported',captureKind:'synthetic_fixture'};
 view.facts=view.facts.map(fact);view.controls=view.controls.map(fact);
 for(const key of ['5m','1h','24h'])view.windows[key]=view.windows[key].map(fact);
 view.riskFindings=view.riskFindings.map(f=>f.id.startsWith('onchain-')||f.id.startsWith('farming-')?f:{...f,tone:'gray',value:null,fieldPath:null,source:null,observedAt:null,responseSha256:null});
 const report=(id,disabled)=>{const i=view.riskFindings.findIndex(f=>f.id===id);view.riskFindings[i]={...view.riskFindings[i],tone:disabled?'green':'red',value:disabled?'Disabled (reported)':'Not disabled (reported)',fieldPath:'audit.'+(id==='mint-authority'?'mintAuthorityDisabled':'freezeAuthorityDisabled'),source:'Jupiter Tokens V2 · SYNTHETIC fixture',observedAt:clock,responseSha256:JUPITER_HASH,explanation:'LOCAL SYNTHETIC provider flag only; independent state and intent are not established.'};};
 if(['provider','provider-negative','conflict'].includes(mode))for(const id of ['mint-authority','freeze-authority'])report(id,mode==='provider');
 const organic=view.riskFindings.find(f=>f.id==='organic');Object.assign(organic,{tone:'green',value:'95/100 · HIGH',fieldPath:'organicScore, organicScoreLabel',source:'Jupiter Tokens V2 · SYNTHETIC fixture',observedAt:clock,responseSha256:JUPITER_HASH,explanation:'LOCAL SYNTHETIC green activity score. It is not wallet-level proof of organic demand.'});
 if(['supported','contradicted','stale','conflict'].includes(mode)){
  const bytes=base({mintAuthority:mode==='contradicted'?OTHER:null,freezeAuthority:mode==='contradicted'?OTHER:null});
  const decoded=await decodeOnchainCapture(capture(rpc(bytes),{requestStartedAt:clock,receivedAt:clock,evaluatedAt:clock}));
  const jupiter=mode==='conflict'?{mint:MINT,sourceUpdatedAt:clock,receivedAt:clock,responseSha256:JUPITER_HASH,mintAuthorityDisabled:false,freezeAuthorityDisabled:false}:undefined;
  const rows=projectOnchainRisk({mint:MINT,evaluatedAt:clock,onchain:decoded,...(jupiter?{jupiter}:{})});
  view.riskFindings=view.riskFindings.map(f=>rows.find(r=>r.id===f.id)??f);
 }
 return view;
}
