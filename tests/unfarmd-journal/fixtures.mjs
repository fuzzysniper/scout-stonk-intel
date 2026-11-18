// SYNTHETIC OFFLINE OWNER INPUTS. No real asset, account, execution or source fact.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=process.env.UNFARMD_JOURNAL_TEST_BUILD;
export const api=require(root+'/current/lib/unfarmd-journal/index.js');
export const risk=require(root+'/reference/lib/unfarmd-risk/index.js');
export const engine=api.createJournalEngine(risk);
export const AT='2026-10-27T12:00:00.000Z';
export const context={evaluatedAt:'2026-10-27T13:00:00.000Z',expectedJournalId:'synthetic-journal'};
export const copy=v=>JSON.parse(JSON.stringify(v));
const USD=amount=>({currency:'USD',amount});
export function plan(){return {version:'unfarmd-risk/1',decision:'PLAN',reason:'Synthetic process exercise',asset:{label:'INVENTED OFFLINE UNIT',assetKey:null},purpose:'swing',horizon:'Owner-chosen week',thesis:'Entered thesis',counterThesis:'The thesis could fail',unknowns:['Liquidity not observed'],affirmation:{ownerEntered:true,lossMayExceedPlan:true,noExecution:true},assumptions:{instrument:'long_spot',currency:'USD',entry:{price:USD('100'),asOf:'2026-10-27T11:59:00.000Z',validForSeconds:3600},invalidation:{kind:'price',price:USD('90'),rationale:'Hypothetical invalidation, not an order'},capital:{reference:USD('10000'),availableCash:USD('10000'),existingExposure:USD('0')},limits:{maxPlannedLoss:USD('100'),maxAllocationBps:1000},costs:{entryFeeBps:0,exitFeeBps:0,entrySlippageBps:0,exitSlippageBps:0,fixedRoundTrip:USD('0')},costsAcknowledged:true,proposedUnits:'5'}};}
export function decision(choice='PLAN',id='d1',recordedAt=AT){return risk.recordDecision(choice==='PLAN'?plan():{version:'unfarmd-risk/1',decision:choice,reason:'Deliberate '+choice},{id,recordedAt}).event;}
export function execution(changes={}){return {version:'unfarmd-risk/1',kind:'execution',id:'x1',decisionId:'d1',occurredAt:'2026-10-27T12:01:00.000Z',recordedAt:'2026-10-27T12:02:00.000Z',mode:'paper',asset:copy(plan().asset),instrument:'long_spot',currency:'USD',units:'5',entryPrice:'100',stopPrice:'90',...changes};}
export function review(changes={}){return {version:'unfarmd-risk/1',kind:'review',id:'v1',decisionId:'d1',recordedAt:'2026-10-27T12:03:00.000Z',outcome:'unknown',evidenceChanged:false,lessons:['Review process, not returns'],...changes};}
export function override(changes={}){return {version:api.VERSION,kind:'override',id:'o1',decisionId:'d1',executionId:'x1',recordedAt:'2026-10-27T12:04:00.000Z',rule:'risk_cap',reason:'Owner admits departing from chosen limit; not authorized',...changes};}
export function journal(){return {version:api.VERSION,journalId:'synthetic-journal',clockBasis:'owner_reported',tail:{sequence:0,receiptId:null},receipts:[]};}
export function append(j,event,extras={}){
 const type=event.kind;
 const seq=j.receipts.length+1;
 const defaults=type==='decision'?{supersedesDecisionId:null,editReason:null}:type==='review'?{executionId:null,supersedesReviewId:null,editReason:null}:{};
 const r={version:api.VERSION,receiptId:'r'+seq,sequence:seq,previousReceiptId:j.tail.receiptId,receivedAt:event.recordedAt,type,event:copy(event),...defaults,...extras};
 j.receipts.push(r);j.tail={sequence:seq,receiptId:r.receiptId};return j;
}
export function full(changes={}){return append(append(append(journal(),decision()),execution(changes)),review(),{executionId:'x1'});}
export function result(j=full(),prior=null){return engine.replay(j,context,prior);}
export function metrics(j=full()){return result(j).state?.metrics;}
