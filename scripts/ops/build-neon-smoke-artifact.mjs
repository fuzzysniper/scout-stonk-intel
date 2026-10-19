/**
 * REVIEW-ONLY local artifact packer for a single protected Vercel Node Function.
 * Does not call Vercel, Neon, Helius or any external service.
 * Produces a Build Output API v3 directory with an OFF approval manifest by default.
 */
import {cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join, resolve, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const HANDLER_FILES = Object.freeze([
  ['scripts/ops/neon-smoke-handler.mjs','handler.mjs'],
  ['scripts/ops/scout-neon-smoke.mjs','scout-neon-smoke.mjs'],
]);
const VALID_NAME = /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/;
const DEFAULT_APPROVAL = Object.freeze({enabled:false});

export function validateApproval(raw, armed, currentCommitSha) {
  if (!armed && raw === undefined) return DEFAULT_APPROVAL;
  if (!armed || !raw || raw.enabled !== true || typeof currentCommitSha !== 'string' ||
      !/^[0-9a-f]{40}$/.test(currentCommitSha) || raw.reviewedCommitSha !== currentCommitSha ||
      typeof raw.operationId !== 'string' || !/^scout-neon-[a-zA-Z0-9_-]{8,80}$/.test(raw.operationId) ||
      !Number.isSafeInteger(raw.startMs) || !Number.isSafeInteger(raw.endMs) ||
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
    if(!VALID_NAME.test(name)) throw Error('invalid_dependency_name');
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

function assertSafeFiles(path){
  const st=lstatSync(path);
  if(st.isSymbolicLink() || (!st.isFile()&&!st.isDirectory()))throw Error('unsafe_dependency_file');
  if(st.isDirectory())for(const child of readdirSync(path)){
    if(child==='.env'||child.startsWith('.env.')||child==='.git'||child==='.neon')
      throw Error('unsafe_dependency_file');
    assertSafeFiles(join(path,child));
  }
}

function fileDigests(root) {
  const out=[];
  function walk(dir) {
    for(const name of readdirSync(dir).sort()) {
      const path=join(dir,name),st=lstatSync(path);
      if(st.isSymbolicLink())throw Error('artifact_symlink');
      if(st.isDirectory())walk(path);
      else {
        const rel=relative(root,path).split(sep).join('/');
        const hash=createHash('sha256').update(readFileSync(path)).digest('hex');
        out.push({path:rel,sha256:hash,bytes:st.size});
      }
    }
  }
  walk(root);return out;
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
  const manifest=validateApproval(approval,armed,reviewedCommitSha);
  const lock=JSON.parse(readFileSync(join(root,'package-lock.json'),'utf8'));
  const closure=packageClosure(lock);
  const functionDir=join(output,'functions','_ops','neon-smoke.func');
  // Complete preflight before creating the output directory.
  for(const [from]of HANDLER_FILES)assertSafeFiles(join(root,from));
  for(const name of closure)assertSafeFiles(join(root,'node_modules',name));
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
  for(const [from,to]of HANDLER_FILES)cpSync(join(root,from),join(functionDir,to));
  for(const name of closure){
    const source=join(root,'node_modules',name),dest=join(functionDir,'node_modules',name);
    mkdirSync(dirname(dest),{recursive:true});cpSync(source,dest,{recursive:true,dereference:false});
  }
  const files=fileDigests(output);
  return Object.freeze({output,files:files.length,pgClosure:closure,
    manifestEnabled:manifest.enabled,filesSha256:createHash('sha256')
      .update(JSON.stringify(files)).digest('hex')});
}

async function main(args) {
  if(args.length!==0)throw Error('approval_requires_a_separately_reviewed_builder');
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
