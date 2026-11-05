import 'server-only';
import https from 'node:https';import type {ClientRequest} from 'node:http';import {checkServerIdentity,type TLSSocket} from 'node:tls';
import {parsePacket} from '../../trader-pulse/validation';import {data} from '../../v4-helius-pilot/server/profile';
import {need,hash} from '../plan';
import {canonical,REPOSITORY,REPOSITORY_ID,REVIEWER_ID,WORKFLOW_PATH,reviewComment,type Context,type Setup,type Source} from './contract';
const ROOT='/repos/'+REPOSITORY;
export type Publication=Readonly<{id:number;payload:{protocol:'native-pilot-publication/1';manifestSha256:string}}>;type D=Record<string,unknown>;
const obj=(x:unknown)=>{need(x&&typeof x==='object'&&!Array.isArray(x));return x as D;};
const positive=(x:unknown)=>Number.isSafeInteger(x)&&Number(x)>0;
export function listingPath(stage:'setup'|'source',c:Context){return ROOT+'/deployments?'+new URLSearchParams({sha:c.identity.commit,environment:'native-pilot-'+stage,task:'native-pilot-'+stage+':'+c.identity.deployment,per_page:'2'});}
/** Candidate transcript selection; no authority is exported by these helpers. Ambiguity/truncation denies. */
export function publication(value:unknown,stage:'setup'|'source',c:Context):Publication{
 need(Array.isArray(value)&&value.length===1);const r=obj(value[0]),p=obj(r.payload),creator=obj(r.creator);
 need(positive(r.id)&&r.sha===c.identity.commit&&r.ref===c.identity.commit&&r.environment==='native-pilot-'+stage&&r.task==='native-pilot-'+stage+':'+c.identity.deployment&&r.production_environment===false&&r.transient_environment===true&&creator.login==='github-actions[bot]'&&creator.type==='Bot'&&creator.id===41898282);
 need(data(p,['protocol','manifestSha256'])&&p.protocol==='native-pilot-publication/1'&&typeof p.manifestSha256==='string'&&/^[a-f0-9]{64}$/.test(p.manifestSha256));return {id:r.id as number,payload:p as Publication['payload']};
}

export function configurationName(stage:'setup'|'source',c:Context){return 'UNFARMD_NATIVE_'+stage.toUpperCase()+'_'+c.identity.deployment.toUpperCase();}
export function configurationPath(stage:'setup'|'source',c:Context){return ROOT+'/actions/variables/'+configurationName(stage,c);}
/** The public deployment exposes only a digest; research scope stays in authenticated config. */
export function privateManifest(value:unknown,p:Publication,stage:'setup'|'source',c:Context){const v=obj(value);need(v.name===configurationName(stage,c)&&typeof v.value==='string'&&Buffer.byteLength(v.value)<=12288&&hash(v.value)===p.payload.manifestSha256);return v.value;}

export function evidencePaths(r:Setup|Source,stage:'setup'|'source',p:Publication){const env='native-pilot-'+stage;return {
 statuses:ROOT+'/deployments/'+p.id+'/statuses?per_page=2',run:ROOT+'/actions/runs/'+r.review.runId,
 reviews:ROOT+'/actions/runs/'+r.review.runId+'/approvals',artifact:ROOT+'/actions/artifacts/'+r.review.artifactId,
 environment:ROOT+'/environments/'+env,branches:ROOT+'/environments/'+env+'/deployment-branch-policies?per_page=2',
 workflow:ROOT+'/contents/'+WORKFLOW_PATH+'?ref='+r.identity.commit
 };}
/** Validate actual documented GitHub objects, not a Boolean owner-approved label.
 * This PURE function still returns only a candidate. Runtime caps require the private fixed-host reader. */
export function verifyEvidence(raw:Record<string,unknown>,r:Setup|Source,stage:'setup'|'source',c:Context,now:number){
 const envName='native-pilot-'+stage,envId=stage==='setup'?c.plan.setupEnvironmentId:c.plan.sourceEnvironmentId;
 const e=obj(raw.environment),rules=e.protection_rules;need(e.id===envId&&e.name===envName&&e.can_admins_bypass===false&&Array.isArray(rules)&&rules.length>=1&&rules.length<=2);
 need(rules.every(x=>['required_reviewers','branch_policy'].includes(String(obj(x).type)))&&rules.filter(x=>obj(x).type==='required_reviewers').length===1&&rules.filter(x=>obj(x).type==='branch_policy').length<=1);
 const rule=obj(rules.find(x=>obj(x).type==='required_reviewers'));need(rule.type==='required_reviewers'&&rule.prevent_self_review===false&&Array.isArray(rule.reviewers)&&rule.reviewers.length===1);
 const only=obj(rule.reviewers[0]),owner=obj(only.reviewer);need(only.type==='User'&&owner.id===REVIEWER_ID&&owner.login==='fuzzysniper'&&owner.type==='User');
 const branchPolicy=obj(e.deployment_branch_policy);need(branchPolicy.protected_branches===false&&branchPolicy.custom_branch_policies===true);
 const branches=obj(raw.branches);need(branches.total_count===1&&Array.isArray(branches.branch_policies)&&branches.branch_policies.length===1);const b=obj(branches.branch_policies[0]);need(b.name===c.plan.branch&&b.type==='branch');
 const run=obj(raw.run),repo=obj(run.repository),headRepo=obj(run.head_repository);need(headRepo.id===REPOSITORY_ID&&run.id===r.review.runId&&run.head_sha===r.identity.commit&&run.head_branch===r.identity.branch&&run.workflow_id===c.plan.workflowId&&run.path===WORKFLOW_PATH&&repo.id===REPOSITORY_ID&&repo.full_name===REPOSITORY&&run.status==='completed'&&run.conclusion==='success'&&['workflow_dispatch','repository_dispatch'].includes(String(run.event)));
 const created=Date.parse(String(run.created_at)),updated=Date.parse(String(run.updated_at));need(Number.isSafeInteger(created)&&Number.isSafeInteger(updated)&&created<=updated&&updated<=now&&created>=r.startsAt-86400000&&now-updated<=86400000);
 const reviews=raw.reviews;need(Array.isArray(reviews)&&reviews.length===1);const review=obj(reviews[0]),user=obj(review.user);need(review.state==='approved'&&user.id===REVIEWER_ID&&user.login==='fuzzysniper'&&user.type==='User'&&review.comment===reviewComment(stage,r)&&Array.isArray(review.environments)&&review.environments.length===1);const re=obj(review.environments[0]);need(re.id===envId&&re.name===envName);
 const artifact=obj(raw.artifact),ar=obj(artifact.workflow_run);need(artifact.id===r.review.artifactId&&artifact.expired===false&&artifact.name==='native-pilot-build-'+r.identity.deployment&&artifact.digest==='sha256:'+r.review.artifactSha256&&ar.head_sha===r.identity.commit&&ar.repository_id===REPOSITORY_ID&&ar.head_repository_id===REPOSITORY_ID&&ar.head_branch===r.identity.branch);
 const wf=obj(raw.workflow);need(wf.type==='file'&&wf.path===WORKFLOW_PATH&&wf.encoding==='base64'&&typeof wf.content==='string'&&wf.content.length<=65536);const encoded=wf.content.replace(/\n/g,''),text=Buffer.from(encoded,'base64');need(text.toString('base64')===encoded&&hash(text)===r.review.workflowSha256);
 const states=raw.statuses;need(Array.isArray(states)&&states.length>=1&&states.length<=2);const status=obj(states[0]),by=obj(status.creator);need(status.state==='success'&&status.environment===envName&&by.id===41898282&&by.login==='github-actions[bot]'&&by.type==='Bot'&&status.log_url==='https://github.com/'+REPOSITORY+'/actions/runs/'+r.review.runId);
 return Object.freeze({kind:'candidate' as const,stage,manifestSha256:hash(canonical(r)),sourceCalls:false as const});
}

export function allowedPath(path:string){
 if(typeof path!=='string'||path.length>1024||!path.startsWith(ROOT+'/'))return false;
 const suffix=path.slice(ROOT.length);
 return /^\/deployments\?sha=[a-f0-9]{40}&environment=native-pilot-(setup|source)&task=native-pilot-(setup|source)%3Adpl_[A-Za-z0-9]{8,100}&per_page=2$/.test(suffix)
 || /^\/deployments\/[1-9][0-9]{0,15}\/statuses\?per_page=2$/.test(suffix)
 || /^\/actions\/variables\/UNFARMD_NATIVE_(SETUP|SOURCE)_DPL_[A-Z0-9]{8,100}$/.test(suffix)
 || /^\/actions\/(runs\/[1-9][0-9]{0,15}(\/approvals)?|artifacts\/[1-9][0-9]{0,15})$/.test(suffix)
 || /^\/environments\/native-pilot-(setup|source)(\/deployment-branch-policies\?per_page=2)?$/.test(suffix)
 || /^\/contents\/\.github\/workflows\/native-pilot-admission\.yml\?ref=[a-f0-9]{40}$/.test(suffix);
}

export type Read= (path:string)=>Promise<unknown>;
/** The only real transport: HTTPS api.github.com/443, GET allowlist, native TLS, no retry/redirect. */
export function githubReader(token:string,signal:AbortSignal):Read{
 need(typeof token==='string'&&/^[A-Za-z0-9_]{20,512}$/.test(token));
 return path=>new Promise((resolve,reject)=>{
  need(allowedPath(path));let request:ClientRequest|undefined,timer:NodeJS.Timeout|undefined,settled=false,bytes=0;const chunks:Buffer[]=[];let authenticated=false;
  const fail=()=>{if(settled)return;settled=true;clearTimeout(timer);request?.destroy();for(const b of chunks)b.fill(0);reject(Error('native_pilot_held'));};
  try{request=https.request({hostname:'api.github.com',servername:'api.github.com',port:443,method:'GET',path,agent:false,rejectUnauthorized:true,minVersion:'TLSv1.2',checkServerIdentity,maxHeaderSize:16384,signal,
   headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json','accept-encoding':'identity','user-agent':'unfarmd-native-admission','x-github-api-version':'2022-11-28'}},response=>{
    if(!authenticated||response.statusCode!==200||response.headers.link||response.headers['content-encoding']&&response.headers['content-encoding']!=='identity'||!/^application\/json(?:;|$)/i.test(response.headers['content-type']??'')){response.destroy();fail();return;}
    response.on('data',(b:Buffer)=>{bytes+=b.length;if(bytes>65536||chunks.length>=128){response.destroy();fail();}else chunks.push(Buffer.from(b));});response.on('aborted',fail);response.on('error',fail);
    response.on('end',()=>{if(settled)return;try{need(bytes>0&&response.complete);const raw=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)),parsed=parsePacket(raw);need(parsed!==null);settled=true;clearTimeout(timer);for(const b of chunks)b.fill(0);resolve(parsed);}catch{fail();}});
   });
  timer=setTimeout(fail,1200);timer.unref();request.on('error',fail);request.on('socket',socket=>{const s=socket as TLSSocket;s.once('secureConnect',()=>{authenticated=s.encrypted&&s.authorized&&s.servername==='api.github.com'&&['TLSv1.2','TLSv1.3'].includes(s.getProtocol()??'')&&!checkServerIdentity('api.github.com',s.getPeerCertificate());if(!authenticated)fail();});});request.end();}catch{fail();}
 });
}
