import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
for(const entry of ['enroll','checkpoint-server'])test('actual compiled '+entry+' operator is OFF before env credentials/port or connection',()=>{
 const file=pathToFileURL(process.env.ADMISSION_BUILD+'/ops/native-beta-release/'+entry+'.js').href;
 const script='const before=process.env;process.env=new Proxy(before,{get(t,k){if(String(k).startsWith("UNFARMD_NATIVE_")||k==="PORT")throw Error("FORBIDDEN_BINDING_ACCESS_WHILE_OFF");return Reflect.get(t,k);}});await import('+JSON.stringify(file)+');';
 assert.equal(execFileSync(process.execPath,['--conditions=react-server','--input-type=module','-e',script],{encoding:'utf8',env:{...process.env},timeout:10000}),'');
});
