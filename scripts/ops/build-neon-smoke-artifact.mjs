/**
 * REVIEW-ONLY local artifact packer for a single protected Vercel Node Function.
 * Does not call Vercel, Neon, Helius or any external service.
 * Produces a Build Output API v3 directory with an OFF approval manifest by default.
 */
import {cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const HANDLER_FILES = Object.freeze([
  ['scripts/ops/neon-smoke-handler.mjs','handler.mjs'],
  ['scripts/ops/scout-neon-smoke.mjs','scout-neon-smoke.mjs'],
]);
const VALID_NAME = /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/;
const DEFAULT_APPROVAL = Object.freeze({enabled:false});
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const validTime = t => Number.isSafeInteger(t) && t > 0 && t <= 253402300799999;

export function validateApproval(raw, armed, currentCommitSha) {
  if (!armed && raw === undefined) return DEFAULT_APPROVAL;
  if (!armed || !raw || raw.enabled !== true || typeof currentCommitSha !== 'string' ||
      !/^[0-9a-f]{40}$/.test(currentCommitSha) || raw.reviewedCommitSha !== currentCommitSha ||
      typeof raw.operationId !== 'string' || !/^scout-neon-[a-zA-Z0-9_-]{8,80}$/.test(raw.operationId) ||
      !validTime(raw.startMs) || !validTime(raw.endMs) ||
      raw.startMs >= raw.endMs || raw.endMs - raw.startMs > 300000 ||
      Object.keys(raw).sort().join(',') !==
        ['enabled','endMs','operationId','reviewedCommitSha','startMs'].sort().join(','))
    throw Error('invalid_or_unapproved_manifest');
  return Object.freeze({
    enabled:true,operationId:raw.operationId,reviewedCommitSha:raw.reviewedCommitSha,
    startMs:raw.startMs,endMs:raw.endMs,
  });
}

function packageClosure(lock) {
  const q=['pg'], visited=new Set();
  while(q.length){
    const name=q.shift();
    if(!VALID_NAME.test(name) || name.split('/').some(p=>p==='.'||p==='..')) throw Error('invalid_dependency_name');
    if(visited.has(name))continue;
    const pkg=lock.packages?.['node_modules/'+name];
    if(!pkg || typeof pkg.version!=='string')throw Error('missing_locked_dependency');
    visited.add(name);
    for(const child of Object.keys(pkg.dependencies??{}))q.push(child);
    for(const child of Object.keys(pkg.optionalDependencies??{}))q.push(child);
  }
  if(lock.packages['node_modules/pg']?.version!=='8.23.1')throw Error('unreviewed_pg_version');
  return [...visited].sort();
}

function assertSafeFiles(path,budget){
  const st=lstatSync(path);
  if(st.isSymbolicLink() || (!st.isFile()&&!st.isDirectory()))throw Error('unsafe_dependency_file');
  if(st.isDirectory())for(const child of readdirSync(path)){
    if(child==='.env'||child.startsWith('.env.')||['.git','.neon','.vercel','.npmrc','.netrc','.git-credentials','auth.json'].includes(child)||child.endsWith('.pem')||child.endsWith('.key'))
      throw Error('unsafe_dependency_file');
    assertSafeFiles(join(path,child),budget);
  }
  else {
    budget.files++;budget.bytes+=st.size;
    if(st.size>1048576 || budget.files>512 || budget.bytes>16*1048576)throw Error('dependency_budget_exceeded');
    const content=readFileSync(path).toString('utf8');
    if(/-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/.test(content) ||
       /https:\/\/mainnet\.helius-rpc\.com\/\?api-key=[a-zA-Z0-9_-]{8,}/.test(content))
      throw Error('credential_pattern_in_artifact');
  }
}

export function fileDigests(root) {
  const out=[];
  function walk(dir) {
    for(const name of readdirSync(dir).sort()) {
      const path=join(dir,name),st=lstatSync(path);
      if(st.isSymbolicLink())throw Error('artifact_symlink');
      if(st.isDirectory())walk(path);
      else if(st.isFile()) {
        const rel=relative(root,path).split(sep).join('/');
        const hash=createHash('sha256').update(readFileSync(path)).digest('hex');
        out.push({path:rel,sha256:hash,bytes:st.size});
      } else throw Error('artifact_special_file');
    }
  }
  walk(root);return out.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}

/** Caller must run npm ci first, review output before any separate deployment. */
export function prepareArtifact({
  root=REPOSITORY_ROOT,
  output=join(root,'.vercel','output'),
  approval=undefined,armed=false,reviewedCommitSha=undefined
}={}) {
  root=resolve(root);output=resolve(output);
  if(output===root||!output.startsWith(root+sep)||existsSync(output))
    throw Error('unsafe_or_existing_output');
  for(let parent=dirname(output);;parent=dirname(parent)) {
    if(existsSync(parent) && (!lstatSync(parent).isDirectory() || lstatSync(parent).isSymbolicLink()))
      throw Error('unsafe_output_ancestor');
    if(parent===root)break;
  }
  const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  if(!/^[0-9a-f]{40}$/.test(sourceCommit))throw Error('invalid_source_commit');
  const sourceClean=execFileSync('git',['status','--porcelain','--untracked-files=all'],{cwd:root,encoding:'utf8'}).trim()==='';
  if(armed && (!sourceClean || reviewedCommitSha!==sourceCommit))throw Error('unreviewed_source');
  const manifest=validateApproval(approval,armed,reviewedCommitSha);
  const lock=JSON.parse(readFileSync(join(root,'package-lock.json'),'utf8'));
  const closure=packageClosure(lock);
  const functionDir=join(output,'functions','_ops','neon-smoke.func');
  // Complete preflight before creating the output directory.
  const budget={files:0,bytes:0};
  for(const [from]of HANDLER_FILES)assertSafeFiles(join(root,from),budget);
  for(const name of closure){
    const source=join(root,'node_modules',name);
    assertSafeFiles(source,budget);
    const installed=JSON.parse(readFileSync(join(source,'package.json'),'utf8'));
    if(installed.name!==name || installed.version!==lock.packages['node_modules/'+name].version)
      throw Error('installed_dependency_lock_mismatch');
  }
  mkdirSync(functionDir,{recursive:true});
  writeFileSync(join(output,'config.json'),JSON.stringify({
    version:3,
    routes:[
      {src:'^/_ops/neon-smoke$',dest:'/_ops/neon-smoke'},
      {handle:'filesystem'},
      {src:'/.*',status:404},
    ],
  },null,2)+'\n');
  writeFileSync(join(functionDir,'.vc-config.json'),JSON.stringify({
    runtime:'nodejs24.x',handler:'handler.mjs',launcherType:'Nodejs',
    maxDuration:10,shouldAddHelpers:true,shouldAddSourcemapSupport:false,
  },null,2)+'\n');
  writeFileSync(join(functionDir,'approval.json'),JSON.stringify(manifest,null,2)+'\n');
  writeFileSync(join(functionDir,'artifact.json'),JSON.stringify({
    version:'scout-neon-artifact/2',sourceCommit,sourceClean,
    lockSha256:sha256(readFileSync(join(root,'package-lock.json'))),
    packages:closure.map(name=>({name,version:lock.packages['node_modules/'+name].version})),
    sources:HANDLER_FILES.map(([from,to])=>({path:to,sha256:sha256(readFileSync(join(root,from)))})),
  },null,2)+'\n');
  for(const [from,to]of HANDLER_FILES)cpSync(join(root,from),join(functionDir,to));
  for(const name of closure){
    const source=join(root,'node_modules',name),dest=join(functionDir,'node_modules',name);
    mkdirSync(dirname(dest),{recursive:true});cpSync(source,dest,{recursive:true,dereference:false});
  }
  const files=fileDigests(output);
  if(files.length>512 || files.reduce((sum,f)=>sum+f.bytes,0)>16*1048576)throw Error('artifact_budget_exceeded');
  return Object.freeze({output,files:files.length,pgClosure:closure,
    manifestEnabled:manifest.enabled,filesSha256:createHash('sha256')
      .update(JSON.stringify(files)).digest('hex')});
}

async function main(args) {
  if(args.length!==0)throw Error('approval_requires_a_separately_reviewed_builder');
  if(execFileSync('git',['status','--porcelain','--untracked-files=all'],{cwd:REPOSITORY_ROOT,encoding:'utf8'}).trim())
    throw Error('clean_reviewed_checkout_required');
  const result=prepareArtifact();
  // Only metadata. No environment, credentials, URLs, DB values or source responses.
  console.log(JSON.stringify({
    artifactReady:true,manifestEnabled:result.manifestEnabled,
    files:result.files,filesSha256:result.filesSha256,
    pgPackages:result.pgClosure,
  }));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(()=>{
    console.error('FAIL: offline artifact preparation failed; details suppressed.');
    process.exitCode=1;
  });
}
