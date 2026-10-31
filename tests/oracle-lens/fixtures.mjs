// INVENTED UI test inputs ONLY. No provider responses, native receipts or real market claims.
import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
export const require=createRequire(import.meta.url),build=process.env.ORACLE_LENS_BUILD;
export const {unavailableView}=require(build+'/lib/v4-owner-preview/view-contract.js');
export const MINT='So11111111111111111111111111111111111111112',OTHER='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',MISSING='11111111111111111111111111111111';
export const CLOCK='2026-10-31T00:00:00.000Z',HASH=createHash('sha256').update('INVENTED LOCAL UI DATA 254').digest('hex');
export const finding=(id,pillar,tone,extra={})=>({id,pillar,tone,title:id==='freeze-authority'?'Freeze authority':id==='lp-control'?'Liquidity withdrawal control':id==='organic'?'Organic activity':id==='wallet-links'?'Related wallets':id==='retention'?'Buyer retention':id,explanation:'LOCAL synthetic finding. This is test data, not a market observation or proof of safety.',value:tone==='gray'?null:tone==='red'?'Permission remains (fixture)':'Fixture value',fieldPath:tone==='gray'?null:'audit.'+id,source:tone==='gray'?null:'Jupiter Tokens V2 · SYNTHETIC UI FIXTURE',observedAt:tone==='gray'?null:CLOCK,responseSha256:tone==='gray'?null:HASH,...extra});
export function inspection(mint=MINT,mode='normal'){
 const v=unavailableView(mint,'LOCAL UI fixture; no source call occurred.');
 if(mode==='off')return v;
 if(mode==='unlisted')return {...v,state:'offline_fixture',identityNote:'Not indexed by the market source. Token existence remains unknown.'};
 if(mode==='unsupported')return {...v,state:'offline_fixture',identity:'unsupported',identityNote:'LOCAL unsupported account fixture; no token facts inferred.'};
 if(mode==='stale')return {...v,state:'unavailable',gaps:['Source row is stale; old figures are withheld.']};
 const fact=(f,value)=>({...f,value,status:'reported',source:'LOCAL UI FIXTURE',observedAt:CLOCK,receivedAt:CLOCK,responseSha256:HASH,captureKind:'synthetic_fixture',path:'fixture.'+f.id,reason:'Invented local UI value; not a provider observation.'});
 const fields=['0.00012345','123456789','223456789','4500000','120000',null];
 const riskFindings=[finding('organic','momentum','green',{value:'95/100 · HIGH'}),finding('verification','momentum','yellow'),finding('lp-control','rug','gray'),finding('wallet-links','farm','gray'),finding('retention','momentum','gray'),finding('freeze-authority','rug','red')];
 if(mode==='many'){for(let i=0;i<20;i++)riskFindings.push(finding('onchain-fixture-'+i,'rug',i===19?'red':'gray'));}
 if(mode==='malformed')riskFindings[0].responseSha256='not-a-hash';
 const window=period=>[{id:period+'-buys',label:'Buys',unit:'transactions',value:'12345'}, {id:period+'-sells',label:'Sells',unit:'transactions',value:'5432'}, {id:period+'-change',label:'Price change',unit:'percent',value:'2.34567'}, {id:period+'-traders',label:'Reported traders',unit:'provider_reported_traders',value:'1234'}].map(f=>fact({...v.facts[0],...f},f.value));
 return {...v,state:'offline_fixture',identity:'provider_reported',name:mint===OTHER?'LOCAL TOKEN B':'LOCAL TOKEN A',symbol:'TEST',identityNote:'LOCAL synthetic UI identity, not a genuine token observation.',facts:v.facts.map((f,i)=>i===5?f:fact(f,fields[i])),windows:{'5m':window('5m'),'1h':window('1h'),'24h':window('24h')},riskFindings,observations:['1h: LOCAL fixture counts only. No demand or persistence conclusion.']};
}
