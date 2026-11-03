// Actual optimized LOCAL source-OFF artifact, no hosted/provider request.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const raw=fs.readFileSync('.next/server/app/api/native-pilot/route.js.nft.json'),trace=JSON.parse(raw).files;
assert.ok(trace.length>0&&trace.length<100);
for(const f of trace)assert.doesNotMatch(f,/node_modules\/(?:pg(?:-[^/]+)?|better-auth|@better-auth|@turnkey)(?:\/|$)|native-tls\.mjs|native-mint\/producer|jupiter-beta-approval|recovery-v2/);
const route=fs.readFileSync('.next/server/app/api/native-pilot/route.js','utf8');assert.doesNotMatch(route,/api\.jup\.ag|jupiter_tokens|HELIUS_API_KEY|BETA_VALIDATOR|DATABASE_URL/);
let client=0;function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);assert.equal(e.isSymbolicLink(),false);if(e.isDirectory())scan(p);else if(/\.(?:js|json)$/.test(e.name)){assert.doesNotMatch(fs.readFileSync(p,'utf8'),/BEGIN PRIVATE KEY|BETA_VALIDATOR_API_PRIVATE_KEY|UNFARMD_OWNER_(?:ISSUER_DSN|AUTH_SECRET|WRAPPED_KEYS|JOURNAL_SIGNING_KEY)|NativePilotAuthority|NATIVE_PILOT_PROVIDER_CREDENTIAL/);client++;}}}scan('.next/static');
console.log(JSON.stringify({kind:'LOCAL_OPTIMIZED_NATIVE_SOURCE_OFF',traceFiles:trace.length,traceSha256:createHash('sha256').update(raw).digest('hex'),clientOutputs:client,inactiveImports:0,clientSecretLeaks:0,sourceCalls:false,hostedAcceptance:false}));
