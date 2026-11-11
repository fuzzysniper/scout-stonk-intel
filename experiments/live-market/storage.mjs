import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export function privatePath(p){
 if(!path.isAbsolute(p))throw Error('ABSOLUTE_PRIVATE_PATH_REQUIRED');
 for(let q=p;;q=path.dirname(q)){
  if(fs.existsSync(q)&&fs.lstatSync(q).isSymbolicLink())throw Error('SYMLINK_NOT_ALLOWED');
  if(fs.existsSync(path.join(q,'.git')))throw Error('OUTSIDE_GIT_REQUIRED');
  if(path.dirname(q)===q)break;
 }
}
export function approvalFile(p){
 privatePath(p);const s=fs.lstatSync(p);if(!s.isFile()||s.size>8192||(process.platform!=='win32'&&(s.mode&0o077)!==0))throw Error('PRIVATE_APPROVAL_FILE_REQUIRED');
 return fs.readFileSync(p,'utf8');
}
/** Claimed before any DNS/socket. Crash retains global lock and permanently spends this pilot ID. */
export function claim(root,id){
 if(!/^pilot-[a-z0-9-]{12,60}$/.test(id))throw Error('INVALID_PILOT_ID');
 privatePath(root);fs.mkdirSync(root,{recursive:true,mode:0o700});
 if(process.platform!=='win32'&&(fs.statSync(root).mode&0o077)!==0)throw Error('PRIVATE_DIRECTORY_REQUIRED');
 if(fs.existsSync(path.join(root,'STOP')))throw Error('KILL_SWITCH_PRESENT');
 const lock=path.join(root,'connection.lock');const fd=fs.openSync(lock,'wx',0o600);fs.writeFileSync(fd,JSON.stringify({pid:process.pid,pilot:id}));fs.fsyncSync(fd);fs.closeSync(fd);
 const dir=path.join(root,id); // pilotId validated before this call; never reuse an existing directory.
 try{
  const spent=path.join(root,'spent');privatePath(spent);fs.mkdirSync(spent,{recursive:true,mode:0o700});
  const marker=fs.openSync(path.join(spent,id+'.json'),'wx',0o600);fs.writeFileSync(marker,JSON.stringify({pilot:id,state:'PERMANENTLY_SPENT_DO_NOT_DELETE'}));fs.fsyncSync(marker);fs.closeSync(marker);
  fs.mkdirSync(dir,{mode:0o700});
 }catch{fs.unlinkSync(lock);throw Error('PILOT_ALREADY_SPENT_OR_STORAGE_FAILURE');}
 let seq=0,total=0,previous='0'.repeat(64);const ledger=fs.openSync(path.join(dir,'receipts.jsonl'),'wx',0o600);
 const retain=(kind,data)=>{
  const row={seq:++seq,previous,kind,data};const text=JSON.stringify(row),sha256=createHash('sha256').update(text).digest('hex');
  const line=JSON.stringify({...row,sha256})+'\n';total+=Buffer.byteLength(line);if(total>33554432)throw Error('JOURNAL_CAP');
  fs.writeSync(ledger,line);fs.fsyncSync(ledger);previous=sha256;
 };
 return {dir,retain,finish(snapshot){retain('final_snapshot',snapshot);fs.closeSync(ledger);const fd=fs.openSync(path.join(dir,'summary.json'),'wx',0o600);fs.writeFileSync(fd,JSON.stringify(snapshot,null,2)+'\n');fs.fsyncSync(fd);fs.closeSync(fd);fs.unlinkSync(lock);}};
}
export function latest(root){
 privatePath(root);if(!fs.existsSync(root))return null;
 const dirs=fs.readdirSync(root).filter(x=>/^pilot-[a-z0-9-]{12,60}$/.test(x)).sort((a,b)=>fs.statSync(path.join(root,b)).mtimeMs-fs.statSync(path.join(root,a)).mtimeMs);
 if(!dirs.length){const spent=path.join(root,'spent');privatePath(spent);return fs.existsSync(spent)&&fs.readdirSync(spent).length?{phase:'RAW_DATA_DELETED',reason:'SPENT_BUDGETS_REMAIN_NO_RESTART',counts:null,rows:[],gaps:[]}:null;}const dir=path.join(root,dirs[0]);privatePath(dir);
 const summary=path.join(dir,'summary.json');
 if(fs.existsSync(summary)){
  privatePath(summary);const ledger=path.join(dir,'receipts.jsonl');privatePath(ledger);
  if(fs.statSync(summary).size>4194304||fs.statSync(ledger).size>33554432)throw Error('LOCAL_ARTIFACT_CAP');
  let previous='0'.repeat(64),seq=0,last;
  for(const line of fs.readFileSync(ledger,'utf8').trimEnd().split('\n')){
   const {sha256,...r}=JSON.parse(line);if(r.seq!==++seq||r.previous!==previous||createHash('sha256').update(JSON.stringify(r)).digest('hex')!==sha256)throw Error('JOURNAL_INTEGRITY');previous=sha256;last=r;
  }
  const s=JSON.parse(fs.readFileSync(summary,'utf8'));if(last?.kind!=='final_snapshot'||JSON.stringify(s)!==JSON.stringify(last.data))throw Error('SUMMARY_INTEGRITY');return s;
 }
 return {phase:'INCOMPLETE_PRIOR_RUN',reason:'CRASH_OR_RUNNING_CHECK_CONNECTION_LOCK',counts:null,rows:[],gaps:[{reason:'NO_COMPLETE_SUMMARY_DO_NOT_ASSUME_ZERO_ACTIVITY'}]};
}
