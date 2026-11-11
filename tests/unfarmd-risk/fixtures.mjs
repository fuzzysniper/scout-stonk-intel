// INVENTED OFFLINE assumptions, not market data, identity verification or advice.
import {createRequire} from 'node:module';
export const risk=createRequire(import.meta.url)(process.env.UNFARMD_RISK_TEST_BUILD+'/lib/unfarmd-risk/index.js');
export const AT='2026-10-27T12:00:00.000Z';
export const USD=amount=>({currency:'USD',amount});
export const context={evaluatedAt:AT};
export const copy=v=>JSON.parse(JSON.stringify(v));
export function plan(){return {version:'unfarmd-risk/1',decision:'PLAN',reason:'Synthetic arithmetic exercise only',asset:{label:'SYNTHETIC UNIT, NOT A REAL SECURITY',assetKey:null},purpose:'swing',horizon:'Owner chose a week',thesis:'Invented exercise: test the entered thesis',counterThesis:'The entered thesis could fail',unknowns:['Liquidity and gaps not observed'],affirmation:{ownerEntered:true,lossMayExceedPlan:true,noExecution:true},assumptions:{instrument:'long_spot',currency:'USD',entry:{price:USD('100'),asOf:'2026-10-27T11:59:00.000Z',validForSeconds:3600},invalidation:{kind:'price',price:USD('90'),rationale:'Owner-chosen hypothetical invalidation, no stop order'},capital:{reference:USD('10000'),availableCash:USD('10000'),existingExposure:USD('0')},limits:{maxPlannedLoss:USD('100'),maxAllocationBps:1000},costs:{entryFeeBps:0,exitFeeBps:0,entrySlippageBps:0,exitSlippageBps:0,fixedRoundTrip:USD('0')},costsAcknowledged:true,proposedUnits:'5'}};}
export const evaluate=p=>risk.evaluateRiskPlan(p,context);
export const codes=r=>r.issues.map(i=>i.code);
export function events(){
 const decision=risk.recordDecision(plan(),{id:'decision-1',recordedAt:AT}).event;
 return {decision,execution:{version:'unfarmd-risk/1',kind:'execution',id:'execution-1',decisionId:'decision-1',occurredAt:'2026-10-27T12:01:00.000Z',recordedAt:'2026-10-27T12:02:00.000Z',mode:'paper',asset:copy(plan().asset),instrument:'long_spot',currency:'USD',units:'5',entryPrice:'100',stopPrice:'90'},review:{version:'unfarmd-risk/1',kind:'review',id:'review-1',decisionId:'decision-1',recordedAt:'2026-10-27T12:03:00.000Z',outcome:'unknown',evidenceChanged:false,lessons:['Synthetic process review; no authentic execution']}};
}
export const reviewContext={evaluatedAt:'2026-10-27T12:04:00.000Z'};
