/** Local/Actions tool. Trusted git capture, exclusive creation, append-only diff verification; no networking. */
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { appendEdition,createEdition,validateEdition,validateIndex,canonical,MAX_ARCHIVE_BYTES } from '../lib/archive';
import type { ArchiveIndex } from '../lib/archive';
const root=process.cwd(),directory=path.join(root,'data/brief-archive');
const git=async(...args:string[])=>{const result=await promisify(execFile)('git',args,{cwd:root,maxBuffer:8*1024*1024,encoding:'buffer'});return result.stdout;};
const readIndex=()=>validateIndex(JSON.parse(fs.readFileSync(path.join(directory,'index.json'),'utf8')));
export async function checkAppendOnly(base:string) {
 if(!/^(?:origin\/main|HEAD\^|[a-f0-9]{40})$/.test(base))throw Error('invalid_base');
 let before:ArchiveIndex={schema:1,dates:{}};
 try{before=validateIndex(JSON.parse((await git('show',base+':data/brief-archive/index.json')).toString()));}catch{if((await git('ls-tree',base,'data/brief-archive/index.json')).length)throw Error('invalid_base_index');}
 const after=readIndex();
 const names=(await git('diff','--name-status',base,'--','data/brief-archive')).toString().trim().split('\n').filter(Boolean);
 for(const line of names){const [status,file]=line.split('\t');if(file==='data/brief-archive/index.json')continue;if(status!=='A'||!/^data\/brief-archive\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{64}\.json$/.test(file))throw Error('edition_mutation');}
 for(const [date,row] of Object.entries(before.dates)) {
  const updated=after.dates[date];if(!updated||updated.original!==row.original||canonical(updated.corrections.slice(0,row.corrections.length))!==canonical(row.corrections))throw Error('index_mutation');
 }
 for(const [date,row] of Object.entries(after.dates)) {
  const seen=new Set<string>();
  for(const id of [row.original,...row.corrections]){
   const file=path.join(directory,date,id+'.json');if(fs.statSync(file).size>MAX_ARCHIVE_BYTES)throw Error('oversized_edition');
   const edition=validateEdition(JSON.parse(fs.readFileSync(file,'utf8')));if(edition.id!==id||edition.body.date!==date)throw Error('index_mismatch');
   if(seen.size===0 && edition.body.correction)throw Error('original_is_correction');
   if(seen.size>0 && (!edition.body.correction||!seen.has(edition.body.correction.parent)))throw Error('correction_chain');seen.add(id);
  }
 }
 // Every new file must be discoverable; no hidden draft content is published by merge.
 for(const line of names){const [,file]=line.split('\t');if(file.endsWith('/index.json'))continue;const parts=file.split('/'),date=parts[2],id=parts[3].slice(0,-5),row=after.dates[date];if(!row||![row.original,...row.corrections].includes(id))throw Error('orphan_edition');}
}
async function main(){
 const [mode,date,parent,notice]=process.argv.slice(2);
 if(mode==='check'){await checkAppendOnly(date??'origin/main');console.log('Archive append-only/reproduction check passed');return;}
 if(mode!=='generate'||!date)throw Error('invalid_command');
 const now=new Date(),index=readIndex(),existing=index.dates[date];
 if(existing&&!parent){validateEdition(JSON.parse(fs.readFileSync(path.join(directory,date,existing.original+'.json'),'utf8')));console.log('duplicate_run: existing original preserved');return;}
 const commit=(await git('rev-parse','HEAD')).toString().trim(),committedAt=(await git('show','-s','--format=%cI','HEAD')).toString().trim();
 // Git uses timezone offsets; preserve exact instant in calendar-valid UTC notation.
 const utc=new Date(committedAt).toISOString();
 const snapshot=await git('show',commit+':data/reward-snapshots.json'),allowlist=await git('show',commit+':data/tracked-mints.json');
 const edition=createEdition({date,snapshot,allowlist,commit,committedAt:utc,correction:parent?{parent,notice:notice??''}:null},now);
 const updated=appendEdition(index,edition);if(updated.state==='duplicate'){console.log('duplicate_run: no bytes changed');return;}
 const folder=path.join(directory,date),file=path.join(folder,edition.id+'.json');fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(file,JSON.stringify(edition,null,2)+'\n',{flag:'wx'});
 const temp=path.join(directory,'index.tmp');fs.writeFileSync(temp,JSON.stringify(updated.index,null,2)+'\n',{flag:'wx'});fs.renameSync(temp,path.join(directory,'index.json'));
 console.log('proposal_created: '+date+' / '+edition.id+' / '+edition.body.findingCount+' findings');
}
if(require.main===module){void main().catch((e:unknown)=>{const safe=e instanceof Error&&/^[a-z_]+$/.test(e.message)?e.message:'source_or_storage_failure';console.error('archive_check_failed: '+safe);process.exitCode=1;});}
