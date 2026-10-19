import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {loadConfigFromFile,resolveConfig,diffConfig} from '@neon/config/v1';

test('Neon policy loads through the official loader without credentials or network',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('OFFLINE_NEON_POLICY_TEST');};
 try{
  const {config}=await loadConfigFromFile({path:resolve('neon.ts')});
  assert.deepEqual(config,{});assert.equal(calls,0);
 }finally{globalThis.fetch=original;}
});
test('SYNTHETIC OFFLINE policy diff never provisions, disables services or changes branch/compute settings',async()=>{
 const {config}=await loadConfigFromFile({path:resolve('neon.ts')});
 for(const exists of [true,false])for(const enabled of [true,false])for(const updateExisting of [true,false]){
  const target={name:'SYNTHETIC_ONLY',id:'br-synthetic-only',exists,isDefault:exists,isProtected:true};
  const desired=resolveConfig(config,target);
  const remote={projectId:'SYNTHETIC_ONLY',branch:{id:target.id,name:target.name,protected:true},
   services:{authEnabled:enabled,dataApiEnabled:enabled},realtime:{enabled,pending:false},
   endpoint:{id:'ep-synthetic-only',autoscaling_limit_min_cu:0.25,autoscaling_limit_max_cu:2,suspend_timeout_seconds:0}};
  assert.deepEqual(diffConfig(desired,remote,{updateExisting}),{plan:[],conflicts:[]});
 }
});
