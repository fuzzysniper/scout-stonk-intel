// Owner-controlled POSIX disk outside source/Neon recovery. No secrets/payloads.
import * as nodeFs from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {hash,uuid,digest,integer,keys,clock} from './policy.mjs';
export const JOURNAL_ENTRY_LIMIT=100000;
const scopeOK=s=>keys(s,['parent','grantHash'])&&uuid(s.parent)&&digest(s.grantHash);
function disk(directory,fs){
 const privateDir=()=>{const s=fs.lstatSync(directory);if(!s.isDirectory()||s.isSymbolicLink()||(s.mode&0o077)!==0)throw Error('unsafe_journal_directory');};
 const syncDir=()=>{const fd=fs.openSync(directory,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}};
 const read=file=>{const s=fs.lstatSync(file);if(!s.isFile()||s.isSymbolicLink()||(s.mode&0o077)!==0||s.size>8192)throw Error('unsafe_journal_entry');return JSON.parse(fs.readFileSync(file,'utf8'));};
 const syncFile=file=>{const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);try{const s=fs.fstatSync(fd);if(!s.isFile()||(s.mode&0o077)!==0)throw Error('unsafe_journal_entry');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}syncDir();};
 const write=(file,value)=>{const fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(value));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}syncDir();};
 return {privateDir,syncDir,read,syncFile,write};
}
/** Existing seam remains usable by prior disposable fixtures. The executable
 * uses openOpsJournal: explicit identity, recovery floor and single-writer lock. */
export function openJournal(directory,scope,{fileSystem=nodeFs,create=true}={}){
 if(!scopeOK(scope))throw Error('invalid_journal_scope');const fs=fileSystem;
 if(create)fs.mkdirSync(directory,{recursive:true,mode:0o700});const d=disk(directory,fs);d.privateDir();let poisoned=false;
 const path=(kind,id)=>join(directory,hash({scope,kind,id})+'.json');
 const guarded=fn=>{if(poisoned)throw Error('journal_unavailable');try{return fn();}catch(e){poisoned=true;if(['external_anchor_mismatch','peer_anchor_mismatch','journal_budget'].includes(e.message))throw e;throw Error('journal_unavailable');}};
 const entries=()=>{const e=fs.readdirSync(directory);if(e.length>=JOURNAL_ENTRY_LIMIT)throw Error('journal_budget');return e;};
 const anchorOK=r=>keys(r,['scope','ticket','credits','observedAt'])&&hash(r.scope)===hash(scope)&&integer(r.ticket)&&integer(r.credits)&&clock(r.observedAt);
 const latest=()=>{const prefix=hash(scope)+'-anchor-',name=entries().filter(n=>n.startsWith(prefix)).sort().at(-1);if(!name)return null;const r=d.read(join(directory,name));if(!anchorOK(r)||name!==prefix+String(r.ticket).padStart(20,'0')+'.json')throw Error('external_anchor_mismatch');return r;};
 return Object.freeze({
  claim(kind,id){
   if(!['notice','incident','suspend'].includes(kind)||typeof id!=='string'||!/^[A-Za-z0-9_:-]{1,100}$/.test(id))throw Error('invalid_journal_effect');
   return guarded(()=>{entries();const file=path(kind,id),record={scope,kind,id,state:'uncertain'};try{d.write(file,record);return true;}catch(e){if(e.code!=='EEXIST')throw e;const old=d.read(file);if(hash(old)!==hash(record))throw Error('invalid_effect_record');d.syncFile(file);return false;}});
  },
  anchor(next){
   if(!keys(next,['ticket','credits','observedAt'])||!integer(next.ticket)||!integer(next.credits)||!clock(next.observedAt))throw Error('invalid_anchor');
   return guarded(()=>{const prior=latest();if(prior&&(next.ticket<prior.ticket||next.credits<prior.credits||Date.parse(next.observedAt)<Date.parse(prior.observedAt)))throw Error('external_anchor_mismatch');
    const file=join(directory,hash(scope)+'-anchor-'+String(next.ticket).padStart(20,'0')+'.json');try{d.write(file,{scope,...next});return next;}catch(e){if(e.code!=='EEXIST')throw e;const old=d.read(file);if(!anchorOK(old)||old.ticket!==next.ticket||old.credits!==next.credits)throw Error('external_anchor_mismatch');d.syncFile(file);return {ticket:old.ticket,credits:old.credits,observedAt:old.observedAt};}
   });
  },
  peer(next){
   if(!keys(next,['peerId','epoch','sequence','observedAt','receiptHash'])||!uuid(next.epoch)||!integer(next.sequence)||!clock(next.observedAt)||!digest(next.receiptHash)||typeof next.peerId!=='string')throw Error('invalid_peer_anchor');
   return guarded(()=>{const prefix=hash({scope,peerId:next.peerId,epoch:next.epoch})+'-peer-',files=entries().filter(n=>n.startsWith(prefix)).sort(),last=files.at(-1);
    if(last){const p=d.read(join(directory,last));if(!keys(p,['scope',...Object.keys(next)])||hash(p.scope)!==hash(scope)||p.peerId!==next.peerId||p.epoch!==next.epoch||!integer(p.sequence)||!clock(p.observedAt)||!digest(p.receiptHash)||last!==prefix+String(p.sequence).padStart(20,'0')+'.json'||next.sequence<p.sequence||Date.parse(next.observedAt)<Date.parse(p.observedAt)||next.sequence===p.sequence&&hash({...p,scope:undefined})!==hash(next))throw Error('peer_anchor_mismatch');}
    const file=join(directory,prefix+String(next.sequence).padStart(20,'0')+'.json');try{d.write(file,{scope,...next});}catch(e){if(e.code!=='EEXIST')throw e;if(hash(d.read(file))!==hash({scope,...next}))throw Error('peer_anchor_mismatch');d.syncFile(file);}return next;
   });
  },
  latestAnchor:()=>guarded(latest),
  healthy:()=>!poisoned
 });
}
/** Owner-only local preparation; never called at startup. OFF touches nothing. */
export function initializeOpsJournal({enabled=false,directory,scope,journalId},{fileSystem=nodeFs}={}){
 if(enabled!==true)return {status:'disabled'};
 if(!scopeOK(scope)||!uuid(journalId))throw Error('invalid_journal_identity');const fs=fileSystem;
 try{fs.mkdirSync(directory,{mode:0o700});}catch(e){if(e.code!=='EEXIST')throw Error('journal_unavailable');}
 const d=disk(directory,fs);d.privateDir();if(fs.readdirSync(directory).length!==0)throw Error('journal_already_initialized_or_uncertain');
 try{d.write(join(directory,'identity.json'),{version:'unfarmd-ops-journal/1',scope,journalId});}catch{throw Error('journal_unavailable');}
 return {status:'initialized',journalId};
}
export function openOpsJournal(directory,scope,{journalId,floor,fileSystem=nodeFs}={}){
 if(!scopeOK(scope)||!uuid(journalId)||!keys(floor,['ticket','credits'])||!integer(floor.ticket)||!integer(floor.credits))throw Error('invalid_journal_identity');
 const fs=fileSystem,d=disk(directory,fs);let lock;
 try{d.privateDir();const identity=d.read(join(directory,'identity.json'));if(hash(identity)!==hash({version:'unfarmd-ops-journal/1',scope,journalId}))throw Error('invalid_journal_identity');
  d.syncFile(join(directory,'identity.json'));lock={scope,journalId,owner:randomUUID()};d.write(join(directory,'active.lock'),lock);
 }catch{throw Error('journal_missing_occupied_or_uncertain');}
 const journal=openJournal(directory,scope,{fileSystem:fs,create:false});let closed=false;
 // No automatic repair/reinitialization, even if recovery rolled the journal back.
 const prior=journal.latestAnchor();if((floor.ticket>0||floor.credits>0)&&(!prior||prior.ticket<floor.ticket||prior.credits<floor.credits))throw Error('external_anchor_mismatch');
 const check=()=>{if(closed)throw Error('journal_closed');};
 return Object.freeze({
  claim(...args){check();return journal.claim(...args);},anchor(...args){check();return journal.anchor(...args);},peer(...args){check();return journal.peer(...args);},
  close({uncertain=false}={}){if(closed)return;closed=true;if(uncertain||!journal.healthy())throw Error('journal_uncertain_lock_retained');try{if(hash(d.read(join(directory,'active.lock')))!==hash(lock))throw 0;fs.unlinkSync(join(directory,'active.lock'));d.syncDir();}catch{throw Error('journal_close_uncertain');}}
 });
}
