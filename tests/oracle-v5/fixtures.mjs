// Local invented format inputs ONLY. The original engines run; no source request occurs.
import {require,build,inspection,finding,MINT,CLOCK} from '../oracle-lens/fixtures.mjs';
export {MINT,CLOCK,inspection,finding};
const {composeOracle}=require(build+'/app/api/v4/ca-intelligence/compose-oracle.js');
const {unknownRiskFindings}=require(build+'/lib/v4-ca-intelligence/risk-evidence.js');
export function ownerShape(mint=MINT,mode='owner'){
 const v=inspection(mint),j=unknownRiskFindings();
 for(const id of ['mint-authority','freeze-authority','concentration','organic','verification']){
  const i=j.findIndex(f=>f.id===id),tone=mode==='red'&&id==='freeze-authority'?'red':mode==='caution'&&['concentration','organic'].includes(id)?'yellow':'green';
  j[i]=finding(id,j[i].pillar,tone,{title:j[i].title,value:['mint-authority','freeze-authority'].includes(id)?tone==='red'?'Not disabled (TEST)':'Disabled (TEST)':id==='concentration'?'12.34567%':id==='organic'?'95/100 · HIGH':'Listing label (TEST)'});
 }
 const view=composeOracle({...v,riskFindings:j},CLOCK);
 if(mode==='unlisted')return composeOracle({...inspection(mint,'unlisted'),identity:'not_found'},CLOCK);
 if(mode==='many'){view.riskFindings=[...view.riskFindings,...Array.from({length:20},(_,i)=>finding('late-'+i,'rug',i===19?'red':'gray'))];}
 if(mode==='malformed')return {...view,riskFindings:[...view.riskFindings,{...view.riskFindings[0],id:'bad-last',responseSha256:'not-a-hash'}]};
 if(mode==='fake-live')return {...view,state:'partial'}; // Test markers still forbid a live label.
 return view;
}
