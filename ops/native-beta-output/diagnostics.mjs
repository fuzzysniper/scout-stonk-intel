// Categories only: never format an exception, URL, response body, token or token hash.
import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync(new URL('./checks.json',import.meta.url)));
const failures=new WeakMap();
const reasons=new Set(['predicate_false','invalid_input','network','tls','timeout','http_status','content_type','pagination','encoding','response_bound','incomplete','json','unclassified']);
export function fail(check,reason='predicate_false',status){
 const e=Error('NATIVE_BUILD_HOLD');
 failures.set(e,Object.freeze({check:Object.hasOwn(catalog,check)?check:'UNCLASSIFIED',reason:reasons.has(reason)?reason:'unclassified',...(Number.isInteger(status)&&status>=100&&status<=599?{httpStatus:status}:{})}));throw e;
}
export function all(conditions){for(const [code,test]of conditions){let ok;try{ok=test();}catch{fail(code,'invalid_input');}if(!ok)fail(code);}}
export function at(code,test){try{return test();}catch(e){if(failures.has(e))throw e;fail(code,'unclassified');}}
export async function atAsync(code,test){try{return await test();}catch(e){if(failures.has(e))throw e;fail(code,'unclassified');}}
export function safeFailure(error){return failures.get(error)??Object.freeze({check:'UNCLASSIFIED',reason:'unclassified'});}
export function reportFailure(error,cliState='not_started'){
 return Object.freeze({version:'native-preview-diagnostic/1',...safeFailure(error),cliState:['not_started','started_unconfirmed','acknowledged'].includes(cliState)?cliState:'started_unconfirmed',sourceGo:false,activate:false});
}
export function responseLabel(host,suffix){
 const kind=host==='api.github.com'?'GH':'VC';
 if(kind==='GH'){
  if(/\/actions\/runs\/\d+\/approvals$/.test(suffix))return 'GH_APPROVALS';
  if(/\/actions\/runs\/\d+$/.test(suffix))return 'GH_RUN';
  if(suffix.includes('/deployment-branch-policies?'))return 'GH_BRANCHES';
  if(suffix.includes('/environments/'))return 'GH_ENVIRONMENT';
 }else{
  if(suffix.startsWith('/v9/projects/'))return 'VC_PROJECT';
  if(suffix.startsWith('/v4/aliases?'))return 'VC_ALIASES';
  if(suffix.startsWith('/v1/webhooks?'))return 'VC_WEBHOOKS';
  if(suffix.startsWith('/v1/integrations/installations?'))return 'VC_LEGACY_INTEGRATIONS';
  if(suffix.startsWith('/v1/integrations/configurations?'))return 'VC_INTEGRATIONS';
  if(suffix.startsWith('/v13/deployments/'))return 'VC_DEPLOYMENT';
 }
 return kind+'_RESPONSE';
}
