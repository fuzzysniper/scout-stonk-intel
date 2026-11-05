import 'server-only';
import {configurationName} from './github';
import {need,hash} from '../plan';
import {canonical,REPOSITORY,reviewComment,setupCandidate,sourceCandidate,type Setup,type Source,type Context} from './contract';
/** Pure operator packet, not an executor/capability. No credential, network, approval or deployment. */
export function publicationPacket(stage:'setup'|'source',record:Setup|Source,context:Context,now:number,setup?:Setup){
 const text=canonical(record);if(stage==='setup')setupCandidate(text,context,now);else{need(setup);sourceCandidate(text,setup,context,now);}
 const environment='native-pilot-'+stage;
 return Object.freeze({kind:'UNEXECUTED_NATIVE_PUBLICATION' as const,activate:false,sourceCalls:false,
  reviewComment:reviewComment(stage,record),manifest:text,manifestSha256:hash(text),
  // Owner installs this NONSECRET private configuration before approval; app token is read-only.
  configuration:{method:'POST',path:'/repos/'+REPOSITORY+'/actions/variables',body:{name:configurationName(stage,context),value:text}},
  request:{method:'POST',path:'/repos/'+REPOSITORY+'/deployments',body:{ref:record.identity.commit,task:environment+':'+record.identity.deployment,auto_merge:false,required_contexts:[],environment,transient_environment:true,production_environment:false,
   description:environment+' '+hash(text),payload:{protocol:'native-pilot-publication/1',manifestSha256:hash(text)}}},
  // The publisher's protected job supplies the returned GitHub metadata id, never a Vercel id.
  success:{state:'success',environment,log_url:'https://github.com/'+REPOSITORY+'/actions/runs/'+record.review.runId}
 });
}
