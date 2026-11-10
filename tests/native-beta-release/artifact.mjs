// Actual selected source-OFF optimized artifact. NOT a deployed build or hosted acceptance.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const selection=JSON.parse(fs.readFileSync('ops/native-beta-release/installation.json'));
assert.deepEqual(selection,{version:'native-private-installation/1',mode:'installed',branch:'native-pilot/private-beta-rc',controlPlan:{workflowId:409607134,setupEnvironmentId:26516929095,sourceEnvironmentId:26517047948,branch:'native-pilot/private-beta-rc'}});
let files=0;function scan(dir){for(const x of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,x.name);assert.equal(x.isSymbolicLink(),false);if(x.isDirectory())scan(p);else if(/\.(js|json)$/.test(x.name)){assert.doesNotMatch(fs.readFileSync(p,'utf8'),/UNFARMD_NATIVE_(?:GITHUB_READ_TOKEN|PG_DSN|PG_CA|AUTH_ISSUER_DSN|AUTH_READER_DSN|AUTH_ENROLL_DSN|AUTH_SECRET|CHECKPOINT_KEY|HELIUS_KEY)|nativeSetupRecord|nativeSourcePermitted|BEGIN PRIVATE KEY/);files++;}}}scan('.next/static');
const traces=[];
for(const name of ['.next/server/app/api/native-pilot/route.js.nft.json','.next/server/app/api/native-pilot/owner/[...all]/route.js.nft.json']){
 const trace=JSON.parse(fs.readFileSync(name)).files;assert.ok(trace.length>0&&trace.length<5000);
 for(const f of trace)assert.doesNotMatch(f,/@turnkey|native-mint\/producer|recovery-v2|@neondatabase\/serverless/);
 assert.ok(trace.some(f=>/node_modules\/pg\//.test(f)),'selected server native pg required');
 if(name.includes('/owner/'))assert.ok(trace.some(f=>{if(!f.endsWith('.js'))return false;const p=path.resolve(path.dirname(name),f);if(!fs.existsSync(p)||!fs.statSync(p).isFile())return false;const source=fs.readFileSync(p,'utf8');return source.includes('BetterAuthError')&&source.includes('better-auth');}),'selected real owner authentication must be in a traced server chunk');
 traces.push({route:name,files:trace.length});
}
console.log(JSON.stringify({kind:'SELECTED_NATIVE_BETA_SOURCE_OFF',clientFiles:files,credentialOrPrivateAdmissionLeaks:0,selectedServerNativePg:true,selectedServerOwnerAuth:true,traces,sourceCalls:false,setupAdmission:false,hostedAcceptance:false,deploymentProvenance:false}));
