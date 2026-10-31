// Test actual compiled predicate only. No source transport or live calls.
import {test} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{internalMarketPreview}=require(process.env.ORACLE_PREVIEW_BUILD+'/lib/v4-ca-intelligence/private-development-gate.js');
const keys=['VERCEL_ENV','VERCEL_PROJECT_ID','VERCEL_GIT_COMMIT_REF','VERCEL_URL','UNFARMD_OWNER_RELEASE'];
const admitted={VERCEL_ENV:'preview',VERCEL_PROJECT_ID:'prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q',VERCEL_GIT_COMMIT_REF:'feat/258-oracle-integrated-preview',VERCEL_URL:'scout-stonk-intel-local-test-riskledgerapp.vercel.app',UNFARMD_OWNER_RELEASE:''};
function gate(values){const before=keys.map(k=>process.env[k]);try{for(const k of keys){if(values[k]===undefined)delete process.env[k];else process.env[k]=values[k];}return internalMarketPreview();}finally{keys.forEach((k,i)=>{if(before[i]===undefined)delete process.env[k];else process.env[k]=before[i];});}}
test('only exact owner-admitted Preview metadata passes; this unit result is not hosted authentication proof',()=>{assert.equal(gate(admitted),true);assert.equal(gate({}),false);});
for(const [name,patch] of [
 ['production',{VERCEL_ENV:'production'}],['development',{VERCEL_ENV:'development'}],['other project',{VERCEL_PROJECT_ID:'prj_other'}],
 ['main',{VERCEL_GIT_COMMIT_REF:'main'}],['old251',{VERCEL_GIT_COMMIT_REF:'feat/251-evidence-risk-readout'}],['parent257',{VERCEL_GIT_COMMIT_REF:'feat/254-alpha-lens-cockpit'}],['substring branch',{VERCEL_GIT_COMMIT_REF:'feat/258-oracle-integrated-preview-extra'}],
 ['public custom domain',{VERCEL_URL:'unfarmd.example'}],['different team hostname',{VERCEL_URL:'scout-stonk-intel-local-otherteam.vercel.app'}],['hostname suffix spoof',{VERCEL_URL:admitted.VERCEL_URL+'.invalid'}],['owner release coexistence',{UNFARMD_OWNER_RELEASE:'{"sourceGo":true}'}],['URL instead of hostname',{VERCEL_URL:'https://'+admitted.VERCEL_URL}]
])test('admission denies '+name,()=>assert.equal(gate({...admitted,...patch}),false));
