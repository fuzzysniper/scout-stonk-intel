// Owner PC only, after separate stage C approval. Not an npm/CI/deploy hook.
import { open, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertInactiveConfig } from './staging-policy.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
export async function readOwnerKeyFile(file) {
 const supplied=file instanceof URL?fileURLToPath(file):file;
 if(typeof supplied!=='string' || !isAbsolute(supplied) || supplied.startsWith('\\\\') || supplied.startsWith('//'))throw Error('key_path_rejected');
 const keyPath=await realpath(supplied),checkout=await realpath(root),rel=relative(checkout,keyPath);
 if(!rel || (!rel.startsWith('..'+sep) && rel!=='..' && !isAbsolute(rel)))throw Error('key_path_rejected');
 const handle=await open(keyPath,'r');
 try {
  const stat=await handle.stat();if(!stat.isFile() || stat.size>8192 || stat.size<1)throw Error('key_file_rejected');
  const bytes=Buffer.alloc(8193);let size=0;
  while(size<bytes.length){const {bytesRead}=await handle.read(bytes,size,bytes.length-size,null);if(!bytesRead)break;size+=bytesRead;}
  if(size>8192)throw Error('key_file_rejected');
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,size));
 }finally{await handle.close();}
}
export async function ownerAuthReadiness(args) {
 // A flag is not owner authorization: the runbook requires separately recorded consent.
 if(args.length!==3 || args[0]!=='--approved-owner-auth' || args[1]!=='--key-file' || !args[2] || Number(process.versions.node.split('.')[0])<24)throw Error('owner_auth_not_approved');
 const config=JSON.parse(await readFile(new URL('./wrangler.json',import.meta.url),'utf8'));assertInactiveConfig(config);
 const key=await readOwnerKeyFile(args[2]);
 const {inspectAppReadiness}=await import('./worker.ts');
 return inspectAppReadiness({...config.vars,APP_PRIVATE_KEY:key},Date.now());
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 try {process.stdout.write(JSON.stringify(await ownerAuthReadiness(process.argv.slice(2)),null,2)+'\n');}
 catch {process.stderr.write('Owner App auth readiness unavailable. Stop; do not share raw credentials or debug logs.\n');process.exitCode=1;}
}
