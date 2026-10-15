// Offline owner-PC guards. Uses only non-key sentinels; never a real secret or API.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownerAuthReadiness,readOwnerKeyFile} from './auth-readiness.mjs';
test('owner command rejects missing/extra flags before reading any key or making requests',async()=>{
 const original=globalThis.fetch,calls=[];globalThis.fetch=(...args)=>{calls.push(args);throw Error('outbound forbidden');};
 try{for(const args of [[],['--key-file','not-read'],['--approved-owner-auth','--key-file','not-read','--deploy']])await assert.rejects(ownerAuthReadiness(args),/owner_auth_not_approved/);assert.deepEqual(calls,[]);}finally{globalThis.fetch=original;}
});
test('key reader rejects checkout paths, symlinks into checkout, oversize files and directories',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'scout-owner-proof-'));try{
  for(const path of ['relative-key.pem','\\\\untrusted-host\\key.pem','//untrusted-host/key.pem'])await assert.rejects(readOwnerKeyFile(path),/key_path_rejected/);
  await assert.rejects(readOwnerKeyFile(new URL('./wrangler.json',import.meta.url)),/key_path_rejected/);
  await symlink(fileURLToPath(new URL('.',import.meta.url)),join(dir,'linked'),process.platform==='win32'?'junction':'dir');
  await assert.rejects(readOwnerKeyFile(join(dir,'linked','wrangler.json')),/key_path_rejected/);
  await writeFile(join(dir,'large'),'x'.repeat(8193));await assert.rejects(readOwnerKeyFile(join(dir,'large')),/key_file_rejected/);
  await assert.rejects(readOwnerKeyFile(dir));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('approved-shaped invocation with a non-key sentinel cannot reach GitHub or leak its value',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'scout-owner-proof-')),file=join(dir,'sentinel.txt');
 const original=globalThis.fetch,calls=[];globalThis.fetch=(...args)=>{calls.push(args);throw Error('outbound forbidden');};
 try{
  await writeFile(file,'offline-sensitive-sentinel-not-a-key');
  await assert.rejects(ownerAuthReadiness(['--approved-owner-auth','--key-file',file]),error=>{assert.equal(error.message,Number(process.versions.node.split('.')[0])>=24?'auth_readiness_unavailable':'owner_auth_not_approved');assert.doesNotMatch(error.stack,/offline-sensitive-sentinel/);return true;});assert.deepEqual(calls,[]);
 }finally{globalThis.fetch=original;await rm(dir,{recursive:true,force:true});}
});
