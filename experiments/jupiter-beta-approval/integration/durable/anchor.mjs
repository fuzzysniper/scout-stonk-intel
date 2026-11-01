// Independent owner-review disk, not the PostgreSQL restore target. No auto repair.
import fs from 'node:fs/promises';import {constants} from 'node:fs';import path from 'node:path';
import {canonical,hash,need,json,digest} from '../json.mjs';
export function fileAnchor({directory,bootstrap}){
 need(path.isAbsolute(directory)&&bootstrap?.seq==='0'&&bootstrap.head==='0'.repeat(64)&&digest(bootstrap.policyHash)&&digest(bootstrap.stateHash));
 const file=path.join(directory,'beta-anchor.jsonl'),lock=path.join(directory,'beta-anchor.lock');
 async function read(owned=false){
  if(!owned)try{await fs.lstat(lock);throw Error('locked');}catch(e){if(e.code!=='ENOENT')throw Error('beta_anchor_held');}
  const st=await fs.lstat(directory);need(st.isDirectory()&&!st.isSymbolicLink());const handle=await fs.open(file,constants.O_RDONLY|constants.O_NOFOLLOW);try{const stat=await handle.stat();need(stat.isFile()&&stat.size>0&&stat.size<=262144&&(stat.mode&0o077)===0);const text=await handle.readFile('utf8');need(text.endsWith('\n'));const lines=text.trimEnd().split('\n');need(lines.length<=514);let previous=null;
   for(const line of lines){const x=json(line);need(x.policyHash===bootstrap.policyHash&&/^\d{1,4}$/.test(x.seq)&&/^[a-f0-9]{64}$/.test(x.head)&&digest(x.stateHash));if(!previous)need(canonical(x)===canonical(bootstrap));else need(Number(x.seq)===Number(previous.seq)+1&&x.previous===hash(canonical(previous)));previous=x;}return {seq:previous.seq,head:previous.head,policyHash:previous.policyHash,stateHash:previous.stateHash,recordHash:hash(canonical(previous))};
  }finally{await handle.close();}
 }
 return Object.freeze({current:()=>read(false),async advance(expected,next){
  // Lock is never timed out/reclaimed. Any uncertain append leaves a persistent HOLD.
  const handle=await fs.open(lock,'wx',0o600);let success=false;try{
   await handle.sync();const current=await read(true);
   need(current.seq===expected.seq&&current.head===expected.head&&current.recordHash===expected.recordHash&&current.stateHash===expected.stateHash&&digest(next.stateHash)&&Number(next.seq)===Number(current.seq)+1&&Number(next.seq)<=513&&/^[a-f0-9]{64}$/.test(next.head));
   const entry={seq:next.seq,head:next.head,stateHash:next.stateHash,policyHash:bootstrap.policyHash,previous:current.recordHash};const out=await fs.open(file,constants.O_WRONLY|constants.O_APPEND|constants.O_NOFOLLOW);try{await out.writeFile(canonical(entry)+'\n');await out.sync();}finally{await out.close();}const dir=await fs.open(directory,'r');try{await dir.sync();}finally{await dir.close();}success=true;return {seq:next.seq,head:next.head,stateHash:next.stateHash};
  }catch{throw Error('beta_anchor_held');}finally{await handle.close();if(success)await fs.unlink(lock);}
 }});
}
