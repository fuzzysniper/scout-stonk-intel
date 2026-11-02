// Current optimized LOCAL artifact audit, no hosted request or authority/source call.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const raw=fs.readFileSync('.next/server/app/api/v4/ca-intelligence/route.js.nft.json'),trace=JSON.parse(raw).files;
assert.ok(trace.length>0&&trace.length<=128);
for(const p of trace)assert.doesNotMatch(p,/node_modules\/(?:@turnkey|pg(?:-[^/]+)?|better-auth|@better-auth)(?:\/|$)|native-tls\.mjs|durable\/|services\/|sdk\/requests|sdk\/receipts|jupiter-beta-approval\/test-only|recovery-v2/);
let files=0,server='',client='';function scan(dir,isClient=false){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);assert.equal(e.isSymbolicLink(),false);if(e.isDirectory())scan(p,isClient);else if(/\.(?:js|json|html)$/.test(e.name)){const s=fs.readFileSync(p,'utf8');assert.doesNotMatch(s,/@turnkey\/(?:http|api-key-stamper)|BETA_VALIDATOR_API_PRIVATE_KEY|unfarmd_beta_authority|\/anchor\/append|unfarmd-v4-recovery\/2|unfarmd-recovery-anchor\/2|unfarmd-jupiter-beta-authorization\/2|unfarmd-jupiter-beta-prototype-envelope/);if(isClient){assert.doesNotMatch(s,/BEGIN PUBLIC KEY|researchPlatformIdentity|JupiterBetaAuthority|verifyV3|UNFARMD_OWNER_(?:ISSUER_DSN|AUTH_SECRET|WRAPPED_KEYS|JOURNAL_SIGNING_KEY)/);client+=s;}else server+=s;files++;}}}
scan('.next/static',true);scan('.next/server');
assert.match(client,/Powered by Jupiter/);assert.match(client,/Jupiter Tokens V2/);assert.match(client,/unfarmd-turnkey-beta-envelope\/1/);
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim();
// Build identity may be tree-shaken away because both trust/source are OFF. It must
// never be a fixture or environment-supplied tree masquerading as an observed one.
assert.doesNotMatch(server,/dpl_SYNTHETICV3ONLY|synthetic-v3-riskledgerapp|LOCAL SYNTHETIC credential/);
console.log(JSON.stringify({kind:'LOCAL_OPTIMIZED_SOURCE_OFF',commit,tree,files,traceFiles:trace.length,traceSha256:createHash('sha256').update(raw).digest('hex'),inactiveImports:0,clientTrustLeaks:0,sourceCalls:false,reservations:false,hostedIdentityVerified:false}));
