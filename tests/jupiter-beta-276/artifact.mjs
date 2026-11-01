// Actual optimized local build, read-only inventory. No credentials, SQL or hosted request.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const raw=fs.readFileSync('.next/server/app/api/v4/ca-intelligence/route.js.nft.json'),files=JSON.parse(raw).files;
assert.ok(Array.isArray(files)&&files.length>0&&files.length<=128);
for(const f of files)assert.doesNotMatch(f.replaceAll('\\','/'),/node_modules\/(?:pg(?:-[^/]+)?|better-auth|@better-auth)(?:\/|$)|native-tls\.mjs|v4-oracle\/native-mint\/producer|recovery-v2/);
let scanned=0;function scan(dir,client=false){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);assert.equal(e.isSymbolicLink(),false,p);if(e.isDirectory())scan(p,client);else if(/\.(?:js|json)$/.test(e.name)){const text=fs.readFileSync(p,'utf8');assert.doesNotMatch(text,/unfarmd-v4-recovery\/2|unfarmd-recovery-anchor\/2|recovery-v2/);if(client)assert.doesNotMatch(text,/JupiterBetaAuthority|betaPlatformIdentity|BEGIN PUBLIC KEY|generateKeyPairSync|UNFARMD_OWNER_(?:ISSUER_DSN|AUTH_SECRET|WRAPPED_KEYS|JOURNAL_SIGNING_KEY)/,'server trust/keys/auth leaked into client');scanned++;}}}
scan('.next/static',true);scan('.next/server');
console.log(JSON.stringify({sourceEnabled:false,traceFiles:files.length,traceSha256:createHash('sha256').update(raw).digest('hex'),inactiveDependencies:0,recoveryBundleMatches:0,clientServerTrustMatches:0,scanned}));
