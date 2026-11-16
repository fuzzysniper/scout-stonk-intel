// Uploader-only exact locked dependency correction. No app import, acquisition, credential or I/O transport.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
export const TAR_VERSION='7.5.22';
export const TAR_INTEGRITY='sha512-MFO/QzvtAOmJbkhOaCTvbGcFN9L9b+JunIsDwaKljSOdcLMea3NJ1k9Usz/rjdfSXTq4dfzfeS7W4p4YOAAHeA==';
export const TAR_PATHS=Object.freeze(['node_modules/@vercel/fun/node_modules/tar','node_modules/tar']);
const deny=()=>{throw Error('NATIVE_BUILD_HOLD');},need=x=>{if(!x)deny();};
const exact=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const json=file=>{const s=fs.lstatSync(file);need(s.isFile()&&!s.isSymbolicLink()&&s.size<=1048576);return JSON.parse(fs.readFileSync(file,'utf8'));};
/** The enclosing tools() still requires the complete exact lock hash and CLI file hashes.
 * Also enumerate EVERY installed/nested tar, reject surprise copies/symlinks and
 * check the packages each actual Vercel consumer resolves (not only root semver). */
export function verifyTarGraph(root){
 try{
  root=path.resolve(root);const pkg=json(path.join(root,'package.json')),lock=json(path.join(root,'package-lock.json'));
  need(exact(pkg,REVIEWED_PACKAGE));
  need(lock.lockfileVersion===3&&lock.packages&&Object.keys(lock.packages).length===376);
  const locked=Object.keys(lock.packages).filter(p=>/(^|\/)node_modules\/tar$/.test(p)).sort();
  need(exact(locked,TAR_PATHS));
  for(const p of locked){const v=lock.packages[p];need(v.version===TAR_VERSION&&v.resolved==='https://registry.npmjs.org/tar/-/tar-'+TAR_VERSION+'.tgz'&&v.integrity===TAR_INTEGRITY&&!v.link);}
  const installed=[];let count=0;
  function packageDir(dir,depth){
   need(depth<=32&&++count<=2048);const stat=fs.lstatSync(dir);need(stat.isDirectory()&&!stat.isSymbolicLink());
   if(path.basename(dir)==='tar'){const p=path.relative(root,dir).split(path.sep).join('/'),v=json(path.join(dir,'package.json'));need(v.name==='tar'&&v.version===TAR_VERSION);installed.push(p);}
   const nested=path.join(dir,'node_modules');if(fs.existsSync(nested))modules(nested,depth+1);
  }
  function modules(dir,depth){
   const stat=fs.lstatSync(dir);need(stat.isDirectory()&&!stat.isSymbolicLink());
   for(const name of fs.readdirSync(dir).sort()){
    if(name.startsWith('.'))continue;const p=path.join(dir,name);
    if(name.startsWith('@')){const s=fs.lstatSync(p);need(s.isDirectory()&&!s.isSymbolicLink());for(const child of fs.readdirSync(p).sort())packageDir(path.join(p,child),depth);}
    else packageDir(p,depth);
   }
  }
  modules(path.join(root,'node_modules'),0);need(exact(installed.sort(),TAR_PATHS));
  const consumers={'@vercel/container':'node_modules/tar','@mapbox/node-pre-gyp':'node_modules/tar','@vercel/fun':'node_modules/@vercel/fun/node_modules/tar'},resolved={};
  for(const [name,p]of Object.entries(consumers)){
   const consumer=path.join(root,'node_modules',name,'package.json'),file=createRequire(consumer).resolve('tar/package.json');
   need(file===path.join(root,p,'package.json')&&fs.realpathSync(file)===file);resolved[name]=p;
  }
  return Object.freeze({version:'native-uploader-tar-graph/1',tar:TAR_VERSION,copies:Object.freeze([...locked]),resolved:Object.freeze(resolved),sourceGo:false,activate:false});
 }catch{deny();}
}

const REVIEWED_PACKAGE={"dependencies":{"vercel":"64.5.0"},"overrides":{"@vercel/container@19.1.3":{"tar":"7.5.22"},"ajv@8.6.3":"8.18.0","js-yaml@4.1.1":"4.3.2","smol-toml@1.5.2":"1.9.0","path-to-regexp@6.1.0":"6.3.0","path-to-regexp@8.3.0":"8.4.0","zod@4.1.11":"4.6.6","minimatch@10.1.1":"11.0.1","undici@5.28.4":"6.29.1","undici@5.29.0":"6.29.1","zod@3.22.4":"4.6.6","glob@13.0.6":"14.0.2"}};
// Every installed package and alias is checked against the enclosing exact lock.
// Optional platform packages may be absent; every required entry must exist.
export function verifyUploaderGraph(root){
 try{
  verifyTarGraph(root);root=path.resolve(root);const lock=json(path.join(root,'package-lock.json')),installed=new Map();let count=0;
  const walk=(dir,depth=0)=>{
   need(depth<=32);const s=fs.lstatSync(dir);need(s.isDirectory()&&!s.isSymbolicLink());
   for(const name of fs.readdirSync(dir).sort()){
    if(name.startsWith('.'))continue;const p=path.join(dir,name),stat=fs.lstatSync(p);need(stat.isDirectory()&&!stat.isSymbolicLink());
    if(name.startsWith('@')){walk(p,depth+1);continue;}
    need(++count<=2048);const rel=path.relative(root,p).split(path.sep).join('/'),pkg=json(path.join(p,'package.json')),entry=lock.packages[rel];
    need(entry&&!entry.link&&entry.version===pkg.version&&pkg.name===(entry.name||rel.split('node_modules/').at(-1)));
    need(typeof entry.integrity==='string'&&entry.integrity.startsWith('sha512-')&&entry.resolved?.startsWith('https://registry.npmjs.org/'));
    installed.set(rel,pkg);
    const nested=path.join(p,'node_modules');if(fs.existsSync(nested))walk(nested,depth+1);
   }
  };walk(path.join(root,'node_modules'));
  for(const [p,v] of Object.entries(lock.packages))if(p&&!v.optional)need(installed.has(p));
  const names=new Set(['tar','undici','@fastify/busboy','ajv','glob','minimatch','js-yaml','path-to-regexp','smol-toml','zod']),copies={},edges=[];
  for(const [p,v]of installed)if(names.has(v.name))copies[p]={name:v.name,version:v.version,integrity:lock.packages[p].integrity};
  for(const [p,v]of installed)for(const name of Object.keys(v.dependencies||{})){
   if(!names.has(name))continue;const req=createRequire(path.join(root,p,'package.json'));let target=path.dirname(req.resolve(name));
   for(let i=0;i<12;i++){const f=path.join(target,'package.json');if(fs.existsSync(f)&&json(f).name===name)break;target=path.dirname(target);}
   const rel=path.relative(root,target).split(path.sep).join('/');need(copies[rel]?.name===name&&fs.realpathSync(target)===target);edges.push({consumer:p,requested:v.dependencies[name],dependency:name,resolved:rel,version:copies[rel].version});
  }
  return Object.freeze({version:'native-uploader-reviewed-graph/1',installed:installed.size,copies,edges,sourceGo:false,activate:false});
 }catch{deny();}
}
