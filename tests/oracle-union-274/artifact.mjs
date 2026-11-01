// Actual optimized local artifact review; no request, credential read or hosted access.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {review,sha} from './review.mjs';
review();
const raw=fs.readFileSync('.next/server/app/api/v4/ca-intelligence/route.js.nft.json');
const files=JSON.parse(raw).files;assert.equal(files.length,72,'clean locked-install trace inventory');
assert.equal(sha(raw),'ba7a82836483b727791dd6f9e1555e730a0ee02b86be45503dced3acc4814650','unchanged isolated CA route trace');
for(const f of files)assert.doesNotMatch(f.replaceAll('\\','/'),/node_modules\/(?:pg(?:-[^/]+)?|better-auth|@better-auth)(?:\/|$)|native-tls\.mjs|v4-oracle\/native-mint\/producer|recovery-v2/);
let scanned=0;
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);assert.equal(e.isSymbolicLink(),false,p);if(e.isDirectory())scan(p);else if(/\.(?:js|json)$/.test(e.name)){assert.doesNotMatch(fs.readFileSync(p,'utf8'),/unfarmd-v4-recovery\/2|unfarmd-recovery-anchor\/2|recovery-v2/,'offline recovery module leaked into '+p);scanned++;}}}
scan('.next/static');scan('.next/server');
console.log(JSON.stringify({status:'offline_artifact_preserved',activate:false,traceFiles:files.length,traceSha256:sha(raw),inactiveDependencies:0,recoveryBundleMatches:0,scanned}));
