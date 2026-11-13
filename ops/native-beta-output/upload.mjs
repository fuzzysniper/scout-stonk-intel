// Operational CLI only. No application import. Default plan performs no network/mutation.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import https from 'node:https';import {checkServerIdentity} from 'node:tls';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {policy,need,hash,inventory,canonical} from './output.mjs';
import {tools,source,cliGitMetadata,verifyLink} from './build.mjs';
import {approval,aliases,unchanged,deployment,edgeProtected,bind} from './verify.mjs';
import {context,paths,getReader,plan,inspectGate} from './preflight.mjs';
export {context,paths,getReader,plan,inspectGate} from './preflight.mjs';
import {all,at,atAsync,reportFailure,fail} from './diagnostics.mjs';
export function deployArgs(cli,emptyConfig){return [cli,'deploy','--prebuilt','--target','preview','--non-interactive','--json','--scope',policy.teamId,'--global-config',emptyConfig];}
export function publicGET(origin,suffix){need(/^https:\/\/scout-stonk-intel-[a-z0-9-]+-riskledgerapp\.vercel\.app$/.test(origin)&&['/lens','/api/native-pilot','/api/native-pilot/owner/status'].includes(suffix));return new Promise((resolve,reject)=>{
 let q,timer,done=false,size=0,auth=false;const chunks=[];const fail=()=>{if(done)return;done=true;clearTimeout(timer);q?.destroy();reject(Error('NATIVE_BUILD_HOLD'));};
 const host=new URL(origin).hostname;q=https.request({hostname:host,servername:host,path:suffix,method:'GET',agent:false,rejectUnauthorized:true,minVersion:'TLSv1.2',checkServerIdentity,headers:{'user-agent':'unfarmd-source-off-protection-check','accept-encoding':'identity'}},r=>{
  if(!auth||r.headers['content-encoding']&&r.headers['content-encoding']!=='identity'){r.destroy();fail();return;}r.on('data',b=>{size+=b.length;if(size>262144){r.destroy();fail();}else chunks.push(Buffer.from(b));});r.on('error',fail);r.on('aborted',fail);r.on('end',()=>{if(done)return;done=true;clearTimeout(timer);const text=Buffer.concat(chunks).toString('utf8');resolve({path:suffix,credentials:'omit',redirected:false,status:r.statusCode,location:r.headers.location,authenticationMarker:/Vercel Authentication|Authentication Required|vercel\.com\/(?:login|sso-api)/i.test(text),applicationJson:/^application\/json/.test(r.headers['content-type']??'')});});
 });timer=setTimeout(fail,4000);q.on('error',fail);q.on('socket',s=>s.once('secureConnect',()=>{auth=s.authorized&&!checkServerIdentity(host,s.getPeerCertificate());if(!auth)fail();}));q.end();
 });}
export async function once({root,toolRoot,receipt,go,ctx,journal,gh,vc,run,probe,clock=Date.now}){
 plan(receipt,go,ctx,clock());all([['EXISTING_JOURNAL',()=>!fs.existsSync(journal)]]);const gate=await inspectGate(ctx,go,gh,vc,clock());
 const proof=await atAsync('LOCAL_SOURCE',()=>source(root,go.commit));all([['LOCAL_TREE',()=>proof.tree===receipt.source.tree]]);at('LOCAL_PROJECT_LINK',()=>verifyLink(root));await atAsync('LOCAL_CLI_GIT',()=>cliGitMetadata(toolRoot,root,proof));all([['LOCAL_OUTPUT',()=>inventory(path.join(root,'.vercel/output')).sha256===receipt.inventorySha256]]);approval(go,ctx,clock());
 at('JOURNAL_WRITE',()=>{const fd=fs.openSync(journal,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify({version:'native-preview-attempt/1',run:ctx.runId,commit:proof.commit,plainBundleSha256:receipt.plainBundleSha256,state:'started_unconfirmed',activate:false}));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}});
 let raw;try{raw=await run();}catch{fail('CLI_INVOCATION','unclassified');}
 let d;try{const value=JSON.parse(raw);d=value.deployment??value;need(/^dpl_[A-Za-z0-9]{8,100}$/.test(d.id));}catch{fail('CLI_ACK','json');}
 at('JOURNAL_ACK',()=>fs.appendFileSync(journal,'\n'+JSON.stringify({version:'native-preview-attempt/1',run:ctx.runId,commit:proof.commit,deploymentId:d.id,state:'acknowledged',activate:false})+'\n',{mode:0o600}));
 const p=paths(ctx,d.id),actual=await vc(p.deployment),identity=deployment(actual,receipt);const post=await vc(p.aliases);need(!post.pagination?.next&&!post.pagination?.until);const after=aliases(post.aliases);unchanged(gate.aliases,after);
 const edge=[];for(const route of ['/lens','/api/native-pilot','/api/native-pilot/owner/status']){const result=await probe(identity.origin,route);edgeProtected(result);edge.push({path:route,status:result.status,authenticationRestrictionObserved:true});}
 approval(go,ctx,clock());const binding=bind(receipt,actual,gate.aliases,after,{id:ctx.runId,head_sha:ctx.sha,head_branch:ctx.branch,repository_id:ctx.repositoryId});
 return {...binding,edge,ownerRuntimeVerification:'PENDING_AUTHENTICATED_OWNER_BROWSER',sourceGo:false,setupAdmission:false};
}
async function main(){
 let cliState='not_started';
 try{
  const [mode,root,toolRoot,receiptFile,goFile,journal]=process.argv.slice(2),receipt=at('INPUT_RECEIPT',()=>JSON.parse(fs.readFileSync(receiptFile))),go=at('INPUT_APPROVAL',()=>JSON.parse(fs.readFileSync(goFile))),ctx=context(process.env);
  if(mode==='plan'){console.log(JSON.stringify(plan(receipt,go,ctx,Date.now())));return;}
  all([['OPERATION',()=>mode==='execute'&&process.env.NATIVE_PREVIEW_OPERATION==='ONE_OWNER_APPROVED_SOURCE_OFF_PREVIEW']]);
  plan(receipt,go,ctx,Date.now());const folder=path.dirname(receiptFile),plain=at('BUNDLE_READ',()=>fs.readFileSync(path.join(folder,'output.private.json'))),body=at('BUNDLE_READ',()=>JSON.parse(plain));all([['BUNDLE_HASH',()=>hash(plain)===receipt.plainBundleSha256],['BUNDLE_SOURCE',()=>canonical(body.source)===canonical(receipt.source)],['BUNDLE_INVENTORY',()=>body.inventory.sha256===receipt.inventorySha256],['CIPHER_HASH',()=>hash(fs.readFileSync(path.join(folder,'build.aesgcm')))===receipt.cipherSha256]]);const cli=at('TOOLCHAIN',()=>tools(toolRoot)),cfg=at('EMPTY_CONFIG',()=>fs.mkdtempSync(path.join(os.tmpdir(),'native-empty-deploy-cli-')));
  const ghPaths=paths(ctx),gh=getReader('api.github.com',process.env.NATIVE_ADMISSION_READ_TOKEN,new Set([ghPaths.run,ghPaths.reviews,ghPaths.environment,ghPaths.branches]));
  const vcPaths=new Set([ghPaths.project,ghPaths.aliases,ghPaths.webhooks,ghPaths.integrations]);
  // Only this actual known deployment ID may be added after a parsed CLI acknowledgement.
  const vcBase=getReader('api.vercel.com',process.env.VERCEL_TOKEN,vcPaths),vc=p=>vcBase(p);
  const result=await once({root,toolRoot,receipt,go,ctx,journal,gh,vc,probe:publicGET,run:()=>{
   const env={PATH:process.env.PATH,HOME:process.env.HOME,NO_UPDATE_NOTIFIER:'1',VERCEL_TELEMETRY_DISABLED:'1',VERCEL_TOKEN:process.env.VERCEL_TOKEN};
   cliState='started_unconfirmed';
   const stdout=execFileSync(process.execPath,deployArgs(cli,cfg),{cwd:root,env,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:120000,maxBuffer:1048576});
   try{const v=JSON.parse(stdout),d=v.deployment??v;if(/^dpl_[A-Za-z0-9]{8,100}$/.test(d.id)){cliState='acknowledged';vcPaths.add(paths(ctx,d.id).deployment);}}catch{/* The one-shot controller preserves uncertain acknowledgement. */}return stdout;
  }});
  const dest=process.env.GITHUB_OUTPUT;if(dest)fs.appendFileSync(dest,'artifact_name='+result.artifactName+'\n');fs.writeFileSync(path.join(path.dirname(receiptFile),'binding.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify(result));
 }catch(error){console.error(JSON.stringify(reportFailure(error,cliState)));console.error('NATIVE_PREVIEW_HOLD: preserve bundle and attempt journal; no retry, rebuild, cleanup or promotion.');process.exitCode=1;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
