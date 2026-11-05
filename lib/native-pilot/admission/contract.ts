import 'server-only';
import {canonical} from '../../../experiments/jupiter-beta-approval/integration/json.mjs';
import {parsePacket} from '../../trader-pulse/validation';
import {data} from '../../v4-helius-pilot/server/profile';
import {freeze} from '../../onchain-mint/validation';
import {TARGET} from '../../v4-owner-preview/release';
import {AUTH_SQL_SHA} from '../../v4-owner-preview/sql-pins';
import pins from '../postgres/pins';
import {policy,hash,need,digest,type Policy} from '../plan';
export {canonical};
export const REPOSITORY='fuzzysniper/scout-stonk-intel';
export const REPOSITORY_ID=1415026436,REVIEWER_ID=58099771;
export const WORKFLOW_PATH='.github/workflows/native-pilot-admission.yml';
export const PHYSICAL_EVIDENCE_SHA='d7f94d6a5e39428430e97fbc108d6e63e46a63cb5f73e6a73ab9e6796f9fd122';
export type Identity=Readonly<{commit:string;tree:string;branch:string;project:string;deployment:string;origin:string}>;
export type ControlPlan=Readonly<{workflowId:number;setupEnvironmentId:number;sourceEnvironmentId:number;branch:string}>;
export type Review=Readonly<{runId:number;artifactId:number;artifactSha256:string;workflowSha256:string}>;
export type Setup=Readonly<{
 version:'native-pilot-setup/1';trust:'owner-reviewed-control-plane/1';sourceGo:false;
 identity:Identity;review:Review;startsAt:number;expiresAt:number;controlPlaneAcceptanceSha256:string;policy:Policy;
 database:Readonly<{project:string;branch:string;database:string;host:string;caSha256:string;postgresMajor:18;tenantId:string;timelineId:string;installerSha256:string;functions:Record<string,string>;physicalEvidenceSha256:string;acceptanceSha256:string;recoveryPolicySha256:string;observedAt:number}>;
 checkpoint:Readonly<{origin:string;resourceId:string;diskId:string;directory:string;keySha256:string;reviewSha256:string;acceptanceSha256:string;observedAt:number}>;
 owner:Readonly<{subject:string;issuer:string;authSecretSha256:string;authSqlSha256:string;acceptanceSha256:string}>;
}>;
export type Source=Readonly<{version:'native-pilot-source/1';trust:'owner-reviewed-control-plane/1';sourceGo:true;identity:Identity;review:Review;setupSha256:string;policySha256:string;startsAt:number;expiresAt:number;methods:readonly string[];maxAttempts:3;maxCredits:number;retries:0}>;
export type Context=Readonly<{identity:Identity;plan:ControlPlan}>;
const id=(x:unknown):x is number=>Number.isSafeInteger(x)&&Number(x)>0;
const hex=(x:unknown,n:number)=>typeof x==='string'&&new RegExp('^[a-f0-9]{'+n+'}$').test(x)&&x!=='0'.repeat(n);
function exact(x:unknown,keys:string[]){need(data(x,keys));}
function window(a:number,b:number,now:number,max:number){need(Number.isSafeInteger(now)&&Number.isSafeInteger(a)&&Number.isSafeInteger(b)&&a>0&&a<=now&&now<b&&b-a>0&&b-a<=max);}
function origin(s:string){const u=new URL(s);need(u.protocol==='https:'&&u.origin===s&&!u.port&&!u.username&&!u.password);}
export function controlPlan(x:ControlPlan){exact(x,['workflowId','setupEnvironmentId','sourceEnvironmentId','branch']);need(id(x.workflowId)&&id(x.setupEnvironmentId)&&id(x.sourceEnvironmentId)&&x.setupEnvironmentId!==x.sourceEnvironmentId&&/^native-pilot\/[a-z0-9-]+$/.test(x.branch));return freeze({...x});}
export function identity(x:Identity,p?:Policy){
 exact(x,['commit','tree','branch','project','deployment','origin']);need(hex(x.commit,40)&&hex(x.tree,40)&&/^native-pilot\/[a-z0-9-]+$/.test(x.branch)&&x.project==='prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q'&&/^dpl_[A-Za-z0-9]{8,100}$/.test(x.deployment));origin(x.origin);
 need(/^https:\/\/scout-stonk-intel-[a-z0-9-]+-riskledgerapp\.vercel\.app$/.test(x.origin)&&!x.origin.includes('-git-'));
 if(p)for(const key of ['commit','tree','branch','project','deployment','origin'] as const)need(x[key]===p[key]);return freeze({...x});
}
function review(x:Review){exact(x,['runId','artifactId','artifactSha256','workflowSha256']);need(id(x.runId)&&id(x.artifactId)&&digest(x.artifactSha256)&&digest(x.workflowSha256));}
function textRecord(text:string){need(typeof text==='string'&&Buffer.byteLength(text)<=12288);parsePacket(text);const r=JSON.parse(text);need(r&&canonical(r)===text);return r;}
/** Pure candidate validation only. Neither this nor a caller's GitHub transcript creates authority. */
export function setupCandidate(text:string,c:Context,now:number):Setup{
 controlPlan(c.plan);identity(c.identity);const s=textRecord(text) as Setup;
 exact(s,['version','trust','sourceGo','identity','review','startsAt','expiresAt','controlPlaneAcceptanceSha256','policy','database','checkpoint','owner']);
 need(s.version==='native-pilot-setup/1'&&s.trust==='owner-reviewed-control-plane/1'&&s.sourceGo===false&&digest(s.controlPlaneAcceptanceSha256));window(s.startsAt,s.expiresAt,now,86400000);
 const p=policy(s.policy);identity(s.identity,p);need(canonical(s.identity)===canonical(c.identity)&&p.branch===c.plan.branch);review(s.review);
 const d=s.database;exact(d,['project','branch','database','host','caSha256','postgresMajor','tenantId','timelineId','installerSha256','functions','physicalEvidenceSha256','acceptanceSha256','recoveryPolicySha256','observedAt']);
 for(const k of ['project','branch','database','host'] as const)need(d[k]===TARGET[k]);
 need(digest(d.caSha256)&&d.postgresMajor===18&&hex(d.tenantId,32)&&hex(d.timelineId,32)&&d.installerSha256===pins.installerSha256&&canonical(d.functions)===canonical(pins.functions)&&d.physicalEvidenceSha256===PHYSICAL_EVIDENCE_SHA&&digest(d.acceptanceSha256)&&digest(d.recoveryPolicySha256));
 need(Number.isSafeInteger(d.observedAt)&&d.observedAt>=s.startsAt&&d.observedAt<=now);
 const a=s.checkpoint;exact(a,['origin','resourceId','diskId','directory','keySha256','reviewSha256','acceptanceSha256','observedAt']);origin(a.origin);
 need(a.origin!==p.origin&&/^[a-zA-Z0-9_-]{8,128}$/.test(a.resourceId)&&/^[a-zA-Z0-9_-]{8,128}$/.test(a.diskId)&&/^\/var\/data\/[a-z0-9-]{8,80}$/.test(a.directory)&&digest(a.keySha256)&&digest(a.reviewSha256)&&digest(a.acceptanceSha256)&&Number.isSafeInteger(a.observedAt)&&a.observedAt>=s.startsAt&&a.observedAt<=now);
 const o=s.owner;exact(o,['subject','issuer','authSecretSha256','authSqlSha256','acceptanceSha256']);need(o.subject===p.ownerSubject&&o.issuer===p.issuer&&digest(o.authSecretSha256)&&o.authSqlSha256===AUTH_SQL_SHA&&digest(o.acceptanceSha256));
 need(p.startsAt>=s.startsAt&&p.expiresAt<=s.expiresAt);return freeze(JSON.parse(text)) as Setup;
}
export function sourceCandidate(text:string,s:Setup,c:Context,now:number):Source{
 const r=textRecord(text) as Source;exact(r,['version','trust','sourceGo','identity','review','setupSha256','policySha256','startsAt','expiresAt','methods','maxAttempts','maxCredits','retries']);
 need(r.version==='native-pilot-source/1'&&r.trust==='owner-reviewed-control-plane/1'&&r.sourceGo===true&&canonical(r.identity)===canonical(c.identity));review(r.review);need(r.review.runId!==s.review.runId);
 window(r.startsAt,r.expiresAt,now,900000);need(r.startsAt===s.policy.startsAt&&r.expiresAt===s.policy.expiresAt&&r.expiresAt<=s.expiresAt&&r.setupSha256===hash(canonical(s))&&r.policySha256===hash(canonical(s.policy))&&canonical(r.methods)==='["getTokenLargestAccounts","getMultipleAccounts","getBlockTime"]'&&r.maxAttempts===3&&r.maxCredits===s.policy.credits&&r.retries===0);return freeze(JSON.parse(text)) as Source;
}
export function reviewComment(stage:'setup'|'source',record:Setup|Source){return 'APPROVE_NATIVE_'+stage.toUpperCase()+' '+hash(canonical(record))+' '+record.review.artifactSha256+' '+record.identity.deployment;}
