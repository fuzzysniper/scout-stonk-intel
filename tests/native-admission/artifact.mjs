// Source-OFF optimized artifact only. This is not future secret-bearing build acceptance.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
let count=0;function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(?:js|json)$/.test(p)){assert.doesNotMatch(fs.readFileSync(p,'utf8'),/UNFARMD_NATIVE_(?:GITHUB_READ_TOKEN|PG_DSN|AUTH_SECRET|CHECKPOINT_KEY|HELIUS_KEY)|nativeSetupRecord|nativeSourcePermitted/);count++;}}}walk('.next/static');
console.log(JSON.stringify({kind:'NATIVE_ADMISSION_SOURCE_OFF_ARTIFACT',clientFiles:count,clientAdmissionOrCredentialLeaks:0,sourceCalls:false,hostedAcceptance:false}));
