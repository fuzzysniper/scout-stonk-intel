import {build} from 'esbuild';import fs from 'node:fs/promises';
import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
await fs.mkdir(path.join(root,'node_modules/.cache/owner'),{recursive:true});
await build({entryPoints:[path.join(root,'owner/app.mjs')],outfile:path.join(root,'node_modules/.cache/owner/owner.js'),bundle:true,platform:'browser',format:'esm',target:'es2022',minify:true,legalComments:'eof'});
await fs.copyFile(path.join(root,'owner/index.html'),path.join(root,'node_modules/.cache/owner/index.html'));await fs.copyFile(path.join(root,'owner/style.css'),path.join(root,'node_modules/.cache/owner/owner.css'));
const text=await fs.readFile(path.join(root,'node_modules/.cache/owner/owner.js'),'utf8');if(/apiPrivateKey|ApiKeyStamper|beta_native_unavailable|unfarmd_beta\.transition|node:fs|BEGIN PRIVATE KEY/.test(text))throw Error('owner_server_boundary');
console.log(JSON.stringify({ownerBuilt:true,serverCredentialsBundled:false,activation:false}));
