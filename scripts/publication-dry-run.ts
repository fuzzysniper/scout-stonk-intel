/** Local replay only. No network, remote, GitHub token, workflow, commit, push or branch edits. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { validateEdition,validateIndex,graceAt,sha,canonical,createEdition } from '../lib/archive';
const execute=promisify(execFile);
export function archiveInventory(root:string):string {
 const directory=path.join(root,'data/brief-archive'),files:Record<string,string>={};
 function visit(dir:string){if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isSymbolicLink())throw Error('archive_symlink');if(entry.isDirectory())visit(file);else files[path.relative(directory,file)]=sha(fs.readFileSync(file));}}
 visit(directory);return canonical(files);
}
export async function dryRun(root:string,date='2026-10-11',now=new Date()){
 const before=archiveInventory(root),startedAt=new Date().toISOString();let disposable:string|undefined;
 const env={NODE_ENV:'test' as const,PATH:process.env.PATH,NODE_PATH:path.join(root,'node_modules')};
 const git=async(cwd:string,...args:string[])=>(await execute('git',['-c','core.hooksPath=/dev/null',...args],{cwd,env,maxBuffer:8*1024*1024})).stdout;
 try{
  const reviewed=(await git(root,'rev-parse','origin/main')).trim();
  const index=validateIndex(JSON.parse(await git(root,'show',reviewed+':data/brief-archive/index.json'))),id=index.dates[date]?.original;if(!id)throw Error('no_reviewed_original');
  const approved=validateEdition(JSON.parse(await git(root,'show',reviewed+':data/brief-archive/'+date+'/'+id+'.json'))),pin=approved.body.inputCommit;
  await git(root,'merge-base','--is-ancestor',pin,reviewed);
  const pinSnapshot=Buffer.from(await git(root,'show',pin+':data/reward-snapshots.json')),pinAllowlist=Buffer.from(await git(root,'show',pin+':data/tracked-mints.json'));
  if('sha256:'+sha(pinSnapshot)!==approved.body.snapshotRevision||'sha256:'+sha(pinAllowlist)!==approved.body.allowlistRevision)throw Error('reviewed_source_mismatch');
  // Do not override the clock or fake a grace-eligible success on an expired replay.
  const replay=createEdition({date,snapshot:pinSnapshot,allowlist:pinAllowlist,commit:pin,committedAt:approved.body.inputCommittedAt},now);
  if(replay.id!==approved.id||replay.body.findingCount!==0||replay.body.rows.some(r=>r.distributedTokens!==null))throw Error('unexpected_no_finding_contract');
  disposable=fs.mkdtempSync(path.join(os.tmpdir(),'scout-publication-dry-run-'));
  await git(root,'clone','--local','--no-hardlinks','--no-checkout',root,disposable);
  await git(disposable,'remote','remove','origin');await git(disposable,'checkout','--detach',pin);
  if((await git(disposable,'remote')).trim())throw Error('unexpected_remote');
  const archive=path.join(disposable,'data/brief-archive');if(fs.existsSync(archive))throw Error('pin_has_existing_archive');
  fs.mkdirSync(archive,{recursive:true});fs.writeFileSync(path.join(archive,'index.json'),JSON.stringify({schema:1,dates:{}}));
  const tool=path.join(__dirname,'archive-tool.js');
  const invoke=async(...args:string[])=>(await execute(process.execPath,[tool,...args],{cwd:disposable,env,maxBuffer:65536,timeout:30000})).stdout;
  await invoke('generate',date);const inventory=archiveInventory(disposable);await invoke('generate',date);
  if(archiveInventory(disposable)!==inventory)throw Error('idempotency_bytes_changed');
  const candidate=validateEdition(JSON.parse(fs.readFileSync(path.join(archive,date,id+'.json'),'utf8')));
  if(candidate.id!==approved.id)throw Error('replay_hash_mismatch');
  await git(disposable,'add','data/brief-archive');await invoke('check',pin);
  await git(disposable,'checkout','--detach','--force',reviewed);await invoke('check',reviewed);
  fs.appendFileSync(path.join(disposable,'data/brief-archive',date,id+'.json'),'\n');await git(disposable,'add','data/brief-archive');
  let mutationRejected=false;try{await invoke('check',reviewed);}catch{mutationRejected=true;}if(!mutationRejected)throw Error('append_only_mutation_not_rejected');
  let graceRejected=false;try{createEdition({date,snapshot:pinSnapshot,allowlist:pinAllowlist,commit:pin,committedAt:approved.body.inputCommittedAt},new Date(graceAt(date)-1));}catch(e){graceRejected=e instanceof Error&&e.message==='grace_pending';}
  if(!graceRejected)throw Error('grace_gate_failed');
  return {mode:'local-only',startedAt,finishedAt:new Date().toISOString(),reviewedMain:reviewed,inputPin:pin,date,editionId:id,snapshotRevision:approved.body.snapshotRevision,
   findingCount:0,checks:['reviewed_git_pin','exact_source_hashes','no_finding_null_figures','real_generator','duplicate_byte_idempotency','edition_reproduction','append_only_git_provenance','approved_edition_edit_rejected','before_grace_rejected','remote_removed','working_archive_unchanged'],cleanup:'disposable checkout removed in finally; no commits or network operations'};
 }finally{
  if(disposable)fs.rmSync(disposable,{recursive:true,force:true});
  if(archiveInventory(root)!==before)throw Error('working_archive_changed');
 }
}
if(require.main===module){const args=process.argv.slice(2);if(args.length>1){console.error('FAIL invalid_dry_run_arguments');process.exitCode=1;}else void dryRun(process.cwd(),args[0]).then(result=>console.log(JSON.stringify(result,null,2))).catch(e=>{const reason=e instanceof Error&&/^[a-z_]+$/.test(e.message)?e.message:'local_replay_failure';console.error('FAIL '+reason+'; local dry run did not authorize publication');process.exitCode=1;});}
