// Uploader-only locked tar correction. No app import, acquisition, credential or I/O transport.
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
  need(exact(pkg,{dependencies:{vercel:'64.5.0'},overrides:{'@vercel/container@19.1.3':{tar:TAR_VERSION}}}));
  need(lock.lockfileVersion===3&&lock.packages&&Object.keys(lock.packages).length===386);
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
