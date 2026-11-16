import {execFileSync} from 'node:child_process';
import fs from 'node:fs';import path from 'node:path';
/** Build-only, commit-bound PUBLIC metadata. No configured tree/SHA pin can replace
 * the actual clean checkout. Missing Git metadata is a runtime identity HOLD. */
export function researchBuildProof(root=process.cwd()){
 try{const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
  if(git('status','--porcelain','--untracked-files=normal'))return null;
  const commit=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}');
  return /^[a-f0-9]{40}$/.test(commit)&&/^[a-f0-9]{40}$/.test(tree)?Object.freeze({commit,tree}):null;
 }catch{return null;}
}
const proof=researchBuildProof();
/** Separate future code-reviewed installation commit, never an environment toggle.
 * Deployment ID/unique URL are bound LATER by setup/source reviews of this SAME artifact. */
export function nativeInstallation(root=process.cwd(),build=researchBuildProof(root)){
 try{
  const x=JSON.parse(fs.readFileSync(path.join(root,'ops/native-beta-release/installation.json'),'utf8'));
  if(Object.keys(x).sort().join(',')!=='branch,controlPlan,mode,version'||x.version!=='native-private-installation/1'||x.branch!=='native-pilot/private-beta-rc')throw Error();
  if(x.mode==='off'&&x.controlPlan===null)return {installed:false,plan:null};
  const p=x.controlPlan;
  if(x.mode!=='installed'||!build||!['commit','tree'].every(k=>/^[a-f0-9]{40}$/.test(build[k])&&build[k]!=='0'.repeat(40))||!p||Object.keys(p).sort().join(',')!=='branch,setupEnvironmentId,sourceEnvironmentId,workflowId'||p.branch!==x.branch
   ||![p.workflowId,p.setupEnvironmentId,p.sourceEnvironmentId].every(n=>Number.isSafeInteger(n)&&n>0)||p.setupEnvironmentId===p.sourceEnvironmentId)throw Error();
  return {installed:true,plan:p};
 }catch{return {installed:false,plan:null};}
}
const native=nativeInstallation(process.cwd(),proof);
const config={webpack(config,{isServer,webpack}){config.plugins.push(new webpack.DefinePlugin({__UNFARMD_NATIVE_INSTALLED__:JSON.stringify(native.installed),...(isServer?{__UNFARMD_RESEARCH_BUILD__:JSON.stringify(proof),__UNFARMD_NATIVE_CONTROL_PLAN__:JSON.stringify(native.plan)}:{})}));return config;}};
export default config;
