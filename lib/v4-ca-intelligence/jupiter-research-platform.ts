import 'server-only';
import type {Identity} from '../../experiments/jupiter-beta-approval/integration/contract.mjs';
import {VERCEL_PROJECT_ID} from '../v4-owner-preview/trust';
import {RESEARCH_BRANCH} from './jupiter-research-contract';
declare const __UNFARMD_RESEARCH_BUILD__:Readonly<{commit:string;tree:string}>|null;
export function researchPlatformIdentity():Identity|null{try{
 const build=typeof __UNFARMD_RESEARCH_BUILD__==='undefined'?null:__UNFARMD_RESEARCH_BUILD__;
 const e=process.env,host=e.VERCEL_URL,commit=e.VERCEL_GIT_COMMIT_SHA,deployment=e.VERCEL_DEPLOYMENT_ID;
 if(!build||!commit||build.commit!==commit||!/^[a-f0-9]{40}$/.test(build.tree)||build.tree==='0'.repeat(40)
 ||!/^[a-f0-9]{40}$/.test(commit)||commit==='0'.repeat(40)||e.VERCEL_ENV!=='preview'||e.VERCEL_PROJECT_ID!==VERCEL_PROJECT_ID
 ||e.VERCEL_GIT_COMMIT_REF!==RESEARCH_BRANCH||e.VERCEL_GIT_PROVIDER!=='github'||e.VERCEL_GIT_REPO_OWNER!=='fuzzysniper'||e.VERCEL_GIT_REPO_SLUG!=='scout-stonk-intel'
 ||!deployment||!/^dpl_[A-Za-z0-9]{8,100}$/.test(deployment)||!host||!/^scout-stonk-intel-[a-z0-9-]+-riskledgerapp\.vercel\.app$/.test(host)||host.startsWith('scout-stonk-intel-git-')||(e.UNFARMD_OWNER_RELEASE||'').trim())return null;
 return Object.freeze({repository:'fuzzysniper/scout-stonk-intel',branch:RESEARCH_BRANCH,commit,tree:build.tree,project:VERCEL_PROJECT_ID,deployment,origin:'https://'+host,environment:'preview'});
}catch{return null;}}
