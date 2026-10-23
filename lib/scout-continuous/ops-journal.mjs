// Owner-controlled local disk, outside source worker/Neon PITR. No secrets/payloads.
import {mkdirSync,lstatSync,openSync,closeSync,writeFileSync,fsyncSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {hash,uuid,digest,integer,keys,clock} from './policy.mjs';
export function openJournal(directory,scope){
 if(!uuid(scope?.parent)||!digest(scope.grantHash))throw Error('invalid_journal_scope');
 mkdirSync(directory,{recursive:true,mode:0o700});const stat=lstatSync(directory);
 if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o077)!==0)throw Error('unsafe_journal_directory');
 const path=(kind,id)=>join(directory,hash({scope,kind,id})+'.json');
 const read=file=>{const s=lstatSync(file);if(!s.isFile()||s.isSymbolicLink()||(s.mode&0o077)!==0||s.size>8192)throw Error('unsafe_journal_entry');return JSON.parse(readFileSync(file,'utf8'));};
 const write=(file,value)=>{
  const fd=openSync(file,'wx',0o600);try{writeFileSync(fd,JSON.stringify(value));fsyncSync(fd);}finally{closeSync(fd);}
  const dir=openSync(directory,'r');try{fsyncSync(dir);}finally{closeSync(dir);}
 };
 return Object.freeze({
  claim(kind,id){if(!['notice','incident','suspend'].includes(kind)||typeof id!=='string'||!/^[A-Za-z0-9_:-]{1,100}$/.test(id))throw Error('invalid_journal_effect');try{write(path(kind,id),{scope,kind,id,state:'uncertain'});return true;}catch(e){if(e.code==='EEXIST')return false;throw Error('journal_unavailable');}},
  anchor(next){
   if(!keys(next,['ticket','credits','observedAt'])||!integer(next.ticket)||!integer(next.credits)||!clock(next.observedAt))throw Error('invalid_anchor');
   // O_EXCL + fixed sequence prevents two independent writers accepting
   // different spend for one ticket. Never overwrite or repair uncertain data.
   const entries=readdirSync(directory);if(entries.length>100000)throw Error('journal_budget');
   const prefix=hash(scope)+'-anchor-',latest=entries.filter(n=>n.startsWith(prefix)).sort().at(-1);
   if(latest){const prior=read(join(directory,latest));if(hash(prior.scope)!==hash(scope)||next.ticket<prior.ticket||next.credits<prior.credits)throw Error('external_anchor_mismatch');}
   const file=join(directory,prefix+String(next.ticket).padStart(20,'0')+'.json');try{write(file,{scope,...next});return next;}catch(e){if(e.code!=='EEXIST')throw Error('journal_unavailable');const old=read(file);if(old.ticket!==next.ticket||old.credits!==next.credits||!clock(old.observedAt)||hash(old.scope)!==hash(scope))throw Error('external_anchor_mismatch');return {ticket:old.ticket,credits:old.credits,observedAt:old.observedAt};}
  }
 });
}
