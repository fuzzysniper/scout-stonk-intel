// No source import in the actual optimized app; the new candidate is UNMOUNTED.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
let count=0;function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);assert.equal(e.isSymbolicLink(),false);if(e.isDirectory())scan(p);else if(/\.(js|json|html)$/.test(p)){assert.doesNotMatch(fs.readFileSync(p,'utf8'),/native-pilot-policy\/1|native-pilot-plan\/1|native_pilot_held|SYNTHETIC_OFFLINE_KEY|native-pilot\.jsonl/);count++;}}}
scan('.next/static');scan('.next/server');console.log(JSON.stringify({kind:'LOCAL_OPTIMIZED_NATIVE_PILOT_UNMOUNTED',files:count,sourceCalls:false,credentialsRead:false,hostedVerification:false}));
