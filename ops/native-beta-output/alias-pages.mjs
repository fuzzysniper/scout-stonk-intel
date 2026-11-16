// Fixed project/team pagination. No URL following, retry, CLI, key or write path.
import {policy} from './identity.mjs';
import {all,atAsync} from './diagnostics.mjs';
import {aliases} from './verify.mjs';
export const aliasLimits=Object.freeze({policy:'vercel-alias-enumeration/1',pages:10,records:1000,pageSize:100});
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const cursor=x=>integer(x)&&x>0;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export function aliasPath(until){
 all([['ALIAS_CURSOR',()=>until===undefined||cursor(until)]]);
 return '/v4/aliases?projectId='+policy.projectId+'&teamId='+policy.teamId+'&limit=100'+(until===undefined?'':'&until='+until);
}
// Canonical path only: no extra filters, escaped characters, URLs or alternative host.
export function aliasRequestAllowed(path){
 if(path===aliasPath())return true;
 const prefix=aliasPath()+'&until=';
 if(typeof path!=='string'||!path.startsWith(prefix))return false;
 const value=path.slice(prefix.length),n=Number(value);
 return cursor(n)&&String(n)===value;
}
export function aliasPage(value,until){
 all([
  ['ALIAS_RESPONSE_SHAPE',()=>object(value)&&Array.isArray(value.aliases)&&object(value.pagination)],
  ['ALIAS_PAGE_BOUND',()=>value.aliases.length<=aliasLimits.pageSize],
  ['ALIAS_PAGINATION_SHAPE',()=>Object.keys(value.pagination).every(k=>['count','next','prev'].includes(k))&&['count','next','prev'].every(k=>Object.hasOwn(value.pagination,k))],
  ['ALIAS_PAGE_COUNT',()=>integer(value.pagination.count)&&value.pagination.count===value.aliases.length],
  ['ALIAS_CURSOR',()=>value.pagination.next===null||cursor(value.pagination.next)],
  ['ALIAS_PREVIOUS_CURSOR',()=>value.pagination.prev===null||cursor(value.pagination.prev)],
  ['ALIAS_CURSOR_PROGRESS',()=>value.pagination.next===null||(value.aliases.length>0&&(until===undefined||value.pagination.next<until))]
 ]);
 return {rows:value.aliases,next:value.pagination.next};
}
// Legacy public helper remains strict: one response is complete only on explicit null.
export function aliasListing(value){const page=aliasPage(value);all([['ALIAS_PAGE_COMPLETE',()=>page.next===null]]);return aliases(page.rows);}
export async function readAliases(read,progress=()=>{}){
 const rows=[],names=new Set(),ids=new Set();let until;
 const state={pagesRequested:0,pagesValidated:0,records:0,termination:'not_started'};
 const emit=()=>progress(Object.freeze({...state}));emit();
 for(let i=0;i<aliasLimits.pages;i++){
  state.pagesRequested++;state.termination='incomplete';emit();
  const page=await atAsync('VC_ALIASES',async()=>aliasPage(await read(aliasPath(until)),until));
  all([['ALIAS_RECORD_CAP',()=>rows.length+page.rows.length<=aliasLimits.records]]);
  for(const x of page.rows){
   all([['ALIAS_RECORD_SHAPE',()=>object(x)],['ALIAS_PROJECT_ID',()=>x.projectId===policy.projectId],['ALIAS_NAME_FORMAT',()=>typeof x.alias==='string'&&/^[a-z0-9.-]+$/.test(x.alias)],['ALIAS_DEPLOYMENT_FORMAT',()=>typeof x.deploymentId==='string'&&/^dpl_[A-Za-z0-9]+$/.test(x.deploymentId)],['ALIAS_UNIQUE',()=>!names.has(x.alias)],['ALIAS_RECORD_ID',()=>!Object.hasOwn(x,'uid')||(typeof x.uid==='string'&&x.uid.length>0&&x.uid.length<=256&&!ids.has(x.uid))]]);
   names.add(x.alias);if(Object.hasOwn(x,'uid'))ids.add(x.uid);
   // Discard creator, bypass and all other unneeded fields; never log raw records.
   rows.push({alias:x.alias,projectId:x.projectId,deploymentId:x.deploymentId});
  }
  state.pagesValidated++;state.records=rows.length;
  if(page.next===null){const result=aliases(rows);state.termination='complete';emit();return result;}
  if(i+1===aliasLimits.pages||rows.length===aliasLimits.records){state.termination='cap_exhausted';emit();all([['ALIAS_ENUMERATION_CAP',()=>false]]);}
  emit();until=page.next;
 }
}
