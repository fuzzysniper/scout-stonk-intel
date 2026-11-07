import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {nativeInstallation,researchBuildProof} from '../../next.config.mjs';
test('shipped installation is OFF; no env/source/runtime Boolean selects it',()=>{assert.deepEqual(nativeInstallation(),{installed:false,plan:null});assert.equal(JSON.parse(fs.readFileSync('ops/native-beta-release/installation.json')).mode,'off');});
test('SYNTHETIC future public code selection requires exact branch/plan AND clean build identity; no committed self SHA or deployment ID',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'native-public-build-'));fs.mkdirSync(path.join(root,'ops/native-beta-release'),{recursive:true});const file=path.join(root,'ops/native-beta-release/installation.json');
 const x={version:'native-private-installation/1',mode:'installed',branch:'native-pilot/private-beta-rc',controlPlan:{workflowId:10,setupEnvironmentId:20,sourceEnvironmentId:21,branch:'native-pilot/private-beta-rc'}},build={commit:'1'.repeat(40),tree:'2'.repeat(40)};
 try{fs.writeFileSync(file,JSON.stringify(x));assert.deepEqual(nativeInstallation(root,build),{installed:true,plan:x.controlPlan});assert.equal(researchBuildProof(root),null);assert.equal(nativeInstallation(root,null).installed,false);
  for(const mutate of [j=>j.mode='true',j=>j.sourceGo=true,j=>j.branch='main',j=>j.controlPlan.branch='other',j=>j.controlPlan.sourceEnvironmentId=20,j=>j.controlPlan.workflowId=0,j=>j.controlPlan.plan='APPROVE']){const a=structuredClone(x);mutate(a);fs.writeFileSync(file,JSON.stringify(a));assert.equal(nativeInstallation(root,build).installed,false);}
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
