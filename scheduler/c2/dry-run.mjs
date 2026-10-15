// Credential-stripped packaging only. No deploy, permission edit, workflow create,
// key read, login, auth call or passthrough arguments; even proposals stay inert.
import {execFile} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {proposal,assertProposal,assertUnchangedStaging} from './policy.mjs';
export async function proofBundle(core=false,sealed=false){
 if(Number(process.versions.node.split('.')[0])<24 || typeof core!=='boolean' || typeof sealed!=='boolean' || core && sealed)throw Error('c2_packaging_unavailable');
 const root=fileURLToPath(new URL('..',import.meta.url));
 assertUnchangedStaging(JSON.parse(await readFile(join(root,'wrangler.json'),'utf8')));assertProposal(proposal);
 const config=structuredClone(proposal);config.main=join(root,core?'c2/hosted-runtime.mjs':sealed?'c2/sealed-entry.mjs':proposal.main);
 if(core){delete config.exports.SlotCoordinator;config.durable_objects.bindings=config.durable_objects.bindings.filter(b=>b.name!=='SLOTS');}
 const dir=await mkdtemp(join(tmpdir(),'scout-c2-bundle-'));
 try{
  const configPath=join(dir,'wrangler.json');await writeFile(configPath,JSON.stringify(config));
  const whitelist='PATH Path SystemRoot SYSTEMROOT SystemDrive COMSPEC PATHEXT TMP TEMP TMPDIR HTTP_PROXY HTTPS_PROXY ALL_PROXY NO_PROXY http_proxy https_proxy all_proxy no_proxy NODE_EXTRA_CA_CERTS SSL_CERT_FILE SSL_CERT_DIR CURL_CA_BUNDLE REQUESTS_CA_BUNDLE'.split(' ');
  const env=Object.fromEntries(whitelist.filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]));
  Object.assign(env,{WRANGLER_SEND_METRICS:'false',WRANGLER_SEND_ERROR_REPORTS:'false',CI:'true',XDG_CONFIG_HOME:join(dir,'config'),WRANGLER_LOG_PATH:join(dir,'logs')});
  const require=createRequire(new URL('../package.json',import.meta.url)),cli=join(dirname(require.resolve('wrangler/package.json')),'bin/wrangler.js');
  await promisify(execFile)(process.execPath,[cli,'deploy','--dry-run','--config',configPath,'--outdir',join(dir,'bundle')],{cwd:dir,env,timeout:60000,maxBuffer:1024*1024});
  const bundle=await readFile(join(dir,'bundle',core?'hosted-runtime.js':sealed?'sealed-entry.js':'hosted-entry.js'),'utf8');
  return {bundle,sha256:createHash('sha256').update(bundle).digest('hex'),bytes:Buffer.byteLength(bundle)};
 }catch{throw Error('c2_packaging_unavailable');}
 finally{await rm(dir,{recursive:true,force:true});}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(process.argv.length!==2)throw Error('c2_packaging_unavailable');
  const core=await proofBundle(true),integration=await proofBundle(),sealed=await proofBundle(false,true);
  process.stdout.write(JSON.stringify({kind:'offline_c2_packaging',liveAuthRun:false,deployed:false,core:{sha256:core.sha256,bytes:core.bytes},integration:{sha256:integration.sha256,bytes:integration.bytes},sealed:{sha256:sealed.sha256,bytes:sealed.bytes}})+'\n');
 }catch{process.stderr.write('C2 offline packaging unavailable. Stop.\n');process.exitCode=1;}
}
