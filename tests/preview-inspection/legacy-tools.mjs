// TEST ONLY. Original vulnerable graph is never an operational uploader fallback.
// Install public packages before offline tests; replay original guards unchanged.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
const input='653f3dd4a636a2781b50d3c2891d71a84a7289e7',lockHash='100ced070fb368d54d1f8e5ab3d7b1d281c118e0859bafee39511edaa4703e85';
const hash=b=>createHash('sha256').update(b).digest('hex'),need=x=>{if(!x)throw Error('LEGACY_TEST_ONLY_TOOLS_HOLD');};
const bytes=(root,name)=>execFileSync('git',['show',input+':ops/native-beta-output/toolchain/'+name],{cwd:root});
const location=root=>path.join(root,'node_modules/.cache/LEGACY_TEST_ONLY_tools_653');
export function legacyToolModules(root=process.cwd()){
 const dest=location(root);need(hash(bytes(root,'package-lock.json'))===lockHash);
 for(const name of ['package.json','package-lock.json'])need(fs.readFileSync(path.join(dest,name)).equals(bytes(root,name)));
 need(fs.readFileSync(path.join(dest,'INSTALL_FINISHED'),'utf8')===lockHash);
 const modules=path.join(dest,'node_modules');need(fs.lstatSync(modules).isDirectory()&&!fs.lstatSync(modules).isSymbolicLink());
 return modules;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=process.cwd(),dest=location(root);
 for(const name of ['VERCEL_TOKEN','NATIVE_ADMISSION_READ_TOKEN','UNFARMD_NATIVE_BUILD_ARCHIVE_KEY','UNFARMD_NATIVE_PREVIEW_DEPLOY_TOKEN','DATABASE_URL'])need(!process.env[name]);
 need(hash(bytes(root,'package-lock.json'))===lockHash);fs.mkdirSync(dest,{recursive:true});
 for(const name of ['package.json','package-lock.json']){const file=path.join(dest,name),b=bytes(root,name);if(fs.existsSync(file))need(fs.readFileSync(file).equals(b));else fs.writeFileSync(file,b,{flag:'wx'});}
 if(!fs.existsSync(path.join(dest,'INSTALL_FINISHED'))){execFileSync('npm',['ci','--prefix',dest,'--cache',path.join(dest,'NPM_TEST_ONLY_CACHE'),'--ignore-scripts','--no-audit','--no-fund'],{stdio:'inherit'});fs.writeFileSync(path.join(dest,'INSTALL_FINISHED'),lockHash,{flag:'wx'});}
 legacyToolModules(root);console.log('LEGACY_TEST_ONLY_ORIGINAL_LOCK_INSTALLED_NO_OPERATIONAL_AUTHORITY');
}
