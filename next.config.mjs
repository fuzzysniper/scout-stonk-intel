import {execFileSync} from 'node:child_process';
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
const config={webpack(config,{isServer,webpack}){if(isServer)config.plugins.push(new webpack.DefinePlugin({__UNFARMD_RESEARCH_BUILD__:JSON.stringify(proof)}));return config;}};
export default config;
