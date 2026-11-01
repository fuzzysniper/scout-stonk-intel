// A real optimized Next build must not acquire SDK, signer, store or new permissions.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const raw=fs.readFileSync('.next/server/app/api/v4/ca-intelligence/route.js.nft.json');
assert.equal(JSON.parse(raw).files.length,73);assert.equal(createHash('sha256').update(raw).digest('hex'),'7b0c5e731a39d51c3889fb1416d2cf83273d1b098c92778c9cc841435e0c1ee1');
for(const f of JSON.parse(raw).files)assert.doesNotMatch(f,/jupiter-beta-approval|@turnkey|unfarmd_beta/);
let outputs=0;function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);assert.equal(e.isSymbolicLink(),false);if(e.isDirectory())scan(p);else if(/\.(?:js|json|html)$/.test(e.name)){assert.doesNotMatch(fs.readFileSync(p,'utf8'),/UNFARMD:JUPITER-BETA:AUTHORIZATION:3|unfarmd-turnkey-beta-envelope|@turnkey\/(?:http|api-key-stamper)|unfarmd_beta_authority|BETA_VALIDATOR_API_PRIVATE_KEY|\/anchor\/append/);outputs++;}}}
scan('.next/static');scan('.next/server');console.log(JSON.stringify({outputs,newAuthorityBundled:false,sourceCalls:false,activate:false,traceFiles:73}));
