// Offline build preparation. No auth/login/pull/deployment command is available here.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';import {pathToFileURL,fileURLToPath} from 'node:url';
import {policy,need,hash,freeze} from './output.mjs';
export function git(root,...args){return execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}
export function tools(root){
 const read=p=>JSON.parse(fs.readFileSync(path.join(root,'node_modules',p,'package.json')));
 need(process.versions.node===policy.node&&read('vercel').version===policy.cli&&read('@vercel/next').version===policy.builder&&read('@vercel/build-utils').version===policy.buildUtils);
 need(execFileSync('npm',['--version'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()===policy.npm);
 need(hash(fs.readFileSync(path.join(root,'package-lock.json')))===policy.toolLockSha256);
 for(const [p,digest]of Object.entries(policy.cliFiles))need(hash(fs.readFileSync(path.join(root,'node_modules/vercel',p)))===digest);
 return path.join(root,'node_modules/vercel/dist/index.js');
}
export async function source(root,expected,{verificationOnly=false}={}){
 need(/^[a-f0-9]{40}$/.test(expected)&&fs.lstatSync(path.join(root,'.git')).isDirectory());
 const commit=git(root,'rev-parse','HEAD'),tree=git(root,'rev-parse','HEAD^{tree}'),branch=git(root,'branch','--show-current');need(commit===expected&&/^[a-f0-9]{40}$/.test(tree)&&!git(root,'status','--porcelain','--untracked-files=normal'));
 need(verificationOnly||branch===policy.branch);need(['https://github.com/'+policy.repository,'https://github.com/'+policy.repository+'.git'].includes(git(root,'remote','get-url','origin')));
 return {commit,tree,branch,project:policy.projectId,repository:policy.repository,verificationOnly};
}
export async function cliGitMetadata(toolRoot,root,proof){
 tools(toolRoot);const {createGitMeta}=await import(pathToFileURL(path.join(toolRoot,'node_modules/vercel/dist/chunks/chunk-JIGCN5QS.js')).href),meta=await createGitMeta(root,{link:{repo:'scout-stonk-intel'}});
 need(meta&&meta.commitSha===proof.commit&&meta.commitRef===proof.branch&&meta.dirty===false&&['https://github.com/'+policy.repository,'https://github.com/'+policy.repository+'.git'].includes(meta.remoteUrl));return {commit:meta.commitSha,branch:meta.commitRef,dirty:false,repository:policy.repository};
}
export function publicLink(root){
 const dir=path.join(root,'.vercel');if(fs.existsSync(dir)){need(fs.lstatSync(dir).isDirectory()&&!fs.lstatSync(dir).isSymbolicLink());need(fs.readdirSync(dir).every(p=>p==='project.json'));}else fs.mkdirSync(dir,{mode:0o700});fs.chmodSync(dir,0o700);
 const p=path.join(dir,'project.json'),profile={projectId:policy.projectId,orgId:policy.teamId,projectName:'scout-stonk-intel',settings:{framework:'nextjs',nodeVersion:'24.x',rootDirectory:null,buildCommand:'npm run build',installCommand:'',devCommand:null,outputDirectory:null}};
 if(fs.existsSync(p))need(JSON.stringify(JSON.parse(fs.readFileSync(p)))===JSON.stringify(profile));else fs.writeFileSync(p,JSON.stringify(profile)+'\n',{flag:'wx',mode:0o600});
 // Only local build metadata is ignored. No source path or identity override.
 const exclude=path.resolve(root,git(root,'rev-parse','--git-path','info/exclude'));const before=fs.readFileSync(exclude,'utf8');if(!before.split('\n').includes('.vercel/'))fs.appendFileSync(exclude,'\n.vercel/\n');
}
export async function build(root,toolRoot,expected,destination,{verificationOnly=false}={}){
 need(!fs.existsSync(destination)&&!fs.existsSync(path.join(root,'.vercel/output')));const cli=tools(toolRoot);
 // Root .env files are never opened; refuse their presence before invoking any compiler.
 need(!fs.readdirSync(root).some(n=>/^\.env(?:\.|$)/.test(n)&&n!=='.env.example'));need(!fs.lstatSync(path.join(root,'node_modules')).isSymbolicLink());
 publicLink(root);const proof=await source(root,expected,{verificationOnly});await cliGitMetadata(toolRoot,root,proof);
 const original=fs.readFileSync(path.join(root,'next-env.d.ts')),cfg=fs.mkdtempSync(path.join(os.tmpdir(),'native-empty-cli-'));fs.chmodSync(cfg,0o700);
 const preloads=[path.resolve(root,'tests/native-postgres/namespace-only.mjs'),path.resolve(root,'tests/security114/local-only.mjs'),path.resolve(root,'tests/native-postgres/no-database.mjs')];
 const env={PATH:process.env.PATH,HOME:process.env.HOME,CI:'1',NO_UPDATE_NOTIFIER:'1',VERCEL_TELEMETRY_DISABLED:'1',NEXT_TELEMETRY_DISABLED:'1',NODE_OPTIONS:preloads.map(p=>'--import='+p).join(' ')};
 execFileSync(process.execPath,[cli,'build','--standalone','--non-interactive','--global-config',cfg],{cwd:root,env,stdio:['ignore','pipe','pipe'],timeout:600000,maxBuffer:4*1024*1024});
 need(git(root,'diff','--name-only').split('\n').filter(Boolean).every(p=>p==='next-env.d.ts'));fs.writeFileSync(path.join(root,'next-env.d.ts'),original);need((await source(root,expected,{verificationOnly})).tree===proof.tree);
 return freeze(path.join(root,'.vercel/output'),proof,destination);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [cmd,root,toolRoot,sha,dest]=process.argv.slice(2);try{need(cmd==='build'||cmd==='verify-build');console.log(JSON.stringify(await build(root,toolRoot,sha,dest,{verificationOnly:cmd==='verify-build'})));}catch{console.error('NATIVE_BUILD_HOLD: preserve any output; no upload or rebuild is authorized by this failure.');process.exitCode=1;}
}
