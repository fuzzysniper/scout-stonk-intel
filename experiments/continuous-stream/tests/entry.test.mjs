import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import {main,requireExtension} from '../entry.mjs';
test('default entry is disabled even when the bounded DATA mode is enabled; no fallback',async()=>{
  const prior=process.env.UNFARMD_CONTINUOUS_ACTIVATION;delete process.env.UNFARMD_CONTINUOUS_ACTIVATION;
  try{assert.deepEqual(await main(),{state:'DISABLED',sourceConnected:false,reason:'SEPARATE_CONTINUOUS_GO_REQUIRED'});}finally{if(prior!==undefined)process.env.UNFARMD_CONTINUOUS_ACTIVATION=prior;}
  const output=execFileSync(process.execPath,[new URL('../run.mjs',import.meta.url).pathname],{env:{UNFARMD_DATA_ACTIVATION:'enabled',UNFARMD_HELIUS_DATA_KEY:'SYNTHETIC_DO_NOT_READ_OR_PRINT'},encoding:'utf8'});
  assert.equal(JSON.parse(output).state,'DISABLED');assert.doesNotMatch(output,/SYNTHETIC_DO_NOT_READ_OR_PRINT/);
});
test('legacy-only or missing store cannot become a continuous port',()=>{
  for(const candidate of [null,{}, {createWorkerStore(){throw Error('MUST_NOT_CALL_LEGACY');}}])assert.throws(()=>requireExtension(candidate),/CONTINUOUS_LEDGER_EXTENSION_REQUIRED/);
  const entry=fs.readFileSync(new URL('../entry.mjs',import.meta.url),'utf8');assert.doesNotMatch(entry,/SCOUT_MINT_HELIUS|SCOUT_MINT_STORE|https:\/\//);
  assert.match(entry,/continuous-store\.mjs/);
});
test('approval template cannot activate and runtime never imports offline models',()=>{
  const sample=JSON.parse(fs.readFileSync(new URL('../approval.example.json',import.meta.url),'utf8'));
  assert.equal(sample.sourceGo,false);assert.equal(sample.hostingGo,false);assert.equal(sample.limits.credits,0);
  for(const name of ['entry.mjs','run.mjs','client.ts','controller.ts'])assert.doesNotMatch(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'),/tests\/fixtures|new Model\(/);
});
