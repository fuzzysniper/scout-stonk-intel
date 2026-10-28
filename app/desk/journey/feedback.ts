/** Presentation of actual validator errors only; never a second readiness/risk engine. */
import type {Issue} from '../../../lib/unfarmd-risk';
import type {Draft,DeskEvaluation} from '../integration/model';
import {fieldLocation,friendlyIssue,issueField,percentToBps,type Percentages} from './model';
const order=['asset','kind','chain','mic','thesis','counterThesis','unknowns','notes','purpose','horizon','instrument','currency','entry','stop','asOfUtc','validSeconds','invalidation','capital','cash','existing','loss','allocationBps','units','costMode','entryFee','exitFee','entrySlip','exitSlip','fixed','reason','costConfirmed','confirmed'];
const groupLabels=['Asset reference','Thesis','Risk assumptions','Reason & confirmations'];
export function feedbackField(issue:Issue,draft:Draft,percentages:Percentages):string {
 if(issue.code==='required')return issue.field; // UI field names, not B's grouped entry object.
 if(issue.code==='invalid_cost_assumptions'&&draft.costMode==='explicit'){
  // B reports the cost group. Navigate to an actually absent/invalid required percentage,
  // using the same exact presentation conversion; no price or risk arithmetic here.
  for(const field of ['entryFee','exitFee','entrySlip','exitSlip'] as const)if(percentToBps(percentages[field])===null)return field;
 }
 return issueField(issue);
}
export function feedbackMessage(issue:Issue):string {
 return issue.code==='required'&&issue.field==='entry'?'Enter your assumed entry price.':friendlyIssue(issue);
}
export function planFeedback(evaluation:DeskEvaluation|null,draft:Draft,percentages:Percentages){
 const errors=(evaluation?.issues??[]).filter(issue=>issue.severity==='error');
 const aggregateFields:Record<string,readonly string[]>={assumptions:order.slice(10,29),capital:['capital','cash','existing'],entry:['entry','asOfUtc','validSeconds'],costs:['entryFee','exitFee','entrySlip','exitSlip','fixed'],limits:['loss','allocationBps']};
 // Preserve every diagnostic in full details. Prefer the validator's precise field
 // error over its enclosing malformed/incomplete-group error for the next action.
 const actionable=errors.filter(issue=>issue.code==='required'||!aggregateFields[issue.field]||!errors.some(other=>other!==issue&&(other.field!==issue.field||other.code==='required')&&aggregateFields[issue.field].includes(feedbackField(other,draft,percentages))));
 const items=actionable.map(issue=>({issue,field:feedbackField(issue,draft,percentages)}))
  .filter((item,index,all)=>all.findIndex(other=>other.field===item.field)===index)
  .sort((a,b)=>(order.indexOf(a.field)<0?999:order.indexOf(a.field))-(order.indexOf(b.field)<0?999:order.indexOf(b.field)));
 const known=items.filter(item=>order.includes(item.field));
 const groups=groupLabels.map((label,stage)=>({label,count:known.filter(item=>fieldLocation(item.field).stage===stage).length})).filter(group=>group.count>0);
 if(known.length<items.length)groups.push({label:'Review validation details',count:items.length-known.length});
 return {errors,items,groups,next:known[0]??null,fieldCount:items.length};
}
