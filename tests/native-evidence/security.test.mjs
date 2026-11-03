import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';
test('entry loads with transport/Jupiter/native issuer/PG modules forbidden',()=>{
 const code=`
 const Module=require('node:module'),assert=require('node:assert/strict');const original=Module._load;let denied=0;
 Module._load=function(id,...args){if(/(?:pg|better-auth)(?:\\/|$)|v4-owner-|v4-helius-native|native-mint|v4-ca-intelligence\\/(?:market|binding|engine|private-development|source)|node:(?:https|http|net|tls)$/.test(id)){denied++;throw Error('FORBIDDEN_ANALYTICS_IMPORT '+id);}return original.call(this,id,...args);};
 globalThis.fetch=()=>{throw Error('NO_PROVIDER_CALL');};
 const api=require(process.env.NATIVE_EVIDENCE_BUILD+'/lib/native-evidence/index.js');
 const v=api.analyzeNativeEvidence({mint:'So11111111111111111111111111111111111111112',evaluatedAt:'2026-11-03T00:00:00.000Z'});
 assert.equal(v.state,'unavailable');assert.equal(v.origin.providerAuthenticated,false);assert.equal(denied,0);console.log('PASS no transport/issuer/Jupiter/native/SQL dependency');
 `;
 const out=execFileSync(process.execPath,['--conditions=react-server','-e',code],{encoding:'utf8',env:process.env});assert.match(out,/PASS/);
});
test('additive module exposes no activation, key, HTTP or SQL acquisition code',()=>{
 for(const name of ['contract.ts','engine.ts','index.ts','transfers.ts','holder.ts']){const code=fs.readFileSync('lib/native-evidence/'+name,'utf8');assert.doesNotMatch(code,/process\.env|fetch\s*\(|https\.request|SELECT |INSERT |readKey|createPool|new Pool|providerAuthenticated:true/);}
});
