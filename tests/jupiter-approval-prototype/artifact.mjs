// No new prototype module/endpoint/signer may be in actual Next output.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const raw=fs.readFileSync('.next/server/app/api/v4/ca-intelligence/route.js.nft.json'),trace=JSON.parse(raw).files;
assert.equal(trace.length,73);assert.equal(createHash('sha256').update(raw).digest('hex'),'7b0c5e731a39d51c3889fb1416d2cf83273d1b098c92778c9cc841435e0c1ee1','same clean277 CA trace');
for(const f of trace)assert.doesNotMatch(f,/jupiter-beta-approval|test-only\/harness/);
let outputs=0;function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);assert.equal(e.isSymbolicLink(),false);if(e.isDirectory())scan(p);else if(/\.(?:js|json|html)$/.test(e.name)){assert.doesNotMatch(fs.readFileSync(p,'utf8'),/UNFARMD:JUPITER-BETA:PROTOTYPE|unfarmd-jupiter-beta-authorization\/2|unfarmd-jupiter-beta-prototype-envelope|\/api\/lab\/|owner-approval\.invalid|jupiter-beta-approval\/test-only/);outputs++;}}}
scan('.next/static');scan('.next/server');console.log(JSON.stringify({outputs,prototypeBundled:false,sourceCalls:false,activate:false,traceFiles:trace.length}));
