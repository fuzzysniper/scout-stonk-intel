/** UI sequence only. Every decision still goes through the unchanged A/B adapter. */
import type {Issue} from '../../../lib/unfarmd-risk';
import {issueField} from './model';
export const questions=[
 {id:'idea',title:"What's the idea?",fields:['asset']},
 {id:'thesis',title:'Why could it work?',fields:['thesis']},
 {id:'against',title:'What might make you wrong?',fields:['counterThesis']},
 {id:'unknown',title:"What's still unknown?",fields:['unknowns']},
 {id:'decision',title:'What feels right for now?',fields:[]},
 {id:'watch',title:'What are you waiting for?',fields:['reason']},
 {id:'pass',title:'Why walk away?',fields:['reason']},
 {id:'purpose',title:'What kind of idea is this?',fields:['purpose']},
 {id:'horizon',title:'When would you review it?',fields:['horizon']},
 {id:'holding',title:'What would you hold?',fields:['instrument']},
 {id:'currency',title:'Which currency will you use?',fields:['currency']},
 {id:'prices',title:'What prices are you assuming?',fields:['entry','stop']},
 {id:'time',title:'When did you make that assumption?',fields:['asOfUtc']},
 {id:'validity',title:'When should it expire?',fields:['validSeconds']},
 {id:'exit',title:'What would make you walk away?',fields:['invalidation']},
 {id:'capital',title:'What money is available?',fields:['capital','cash','existing']},
 {id:'limits',title:'What are your planning limits?',fields:['loss','allocationBps']},
 {id:'quantity',title:'Do you have a quantity in mind?',fields:['units']},
 {id:'costs',title:'How will you handle costs?',fields:['costMode']},
 {id:'fees',title:'What fees are you assuming?',fields:['entryFee','exitFee']},
 {id:'slippage',title:'What slippage are you allowing for?',fields:['entrySlip','exitSlip']},
 {id:'fixed',title:'Any fixed round-trip cost?',fields:['fixed']},
 {id:'review',title:'Does this plan reflect your thinking?',fields:['reason','costConfirmed','confirmed']},
] as const;
export type Screen=typeof questions[number]['id'];
export const fieldsFor=(screen:Screen):readonly string[]=>questions.find(q=>q.id===screen)!.fields;
export const fieldForIssue=(issue:Issue)=>issue.code==='required'?issue.field:issueField(issue);
export const screenFor=(field:string):Screen=>questions.find(q=>q.id!=='watch'&&q.id!=='pass'&&(q.fields as readonly string[]).includes(field))?.id??'review';
export const nextScreen=(screen:Screen,omitted:boolean):Screen=>screen==='costs'&&omitted?'review':questions[questions.findIndex(q=>q.id===screen)+1]?.id??'review';
/** Only an explicit user action calls this. UTC is preserved to milliseconds. */
export const captureTime=(now:Date)=>Number.isFinite(now.getTime())?now.toISOString():null;
export const durations=[['900','15 minutes'],['3600','1 hour'],['86400','1 day'],['custom','Another duration']] as const;
