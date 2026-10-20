/** OFFLINE ONLY. Validates sanitized control-plane snapshots; never deploys or repairs aliases. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {EXPECTED} from './scout-neon-smoke.mjs';

export const TEAM_ID = 'team_x1JQRQhMe5Ic1VFpklZMPM2j';
export const PROTECTED_ALIASES = Object.freeze([
  'scout.storkcoin.xyz', 'scout-stonk-intel.vercel.app',
  'scout-stonk-intel-riskledgerapp.vercel.app',
  'scout-stonk-intel-git-main-riskledgerapp.vercel.app',
]);
const requireProof = b => {if(!b)throw Error('alias_safety_unproven');};
const host = s => typeof s==='string' && s.length<=253 && /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(s);
const digest = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
function completePage(page,key) {
  requireProof(page && Array.isArray(page[key]) && page[key].length<=100 &&
    page.pagination?.next===null && page.pagination.count===page[key].length);
  return page[key]; // Never interpret errors, absent pagination or a partial first page as empty/safe.
}
function unique(rows,key) {requireProof(new Set(rows.map(r=>r[key])).size===rows.length);}

export function snapshot(raw) {
  const p=raw?.project;
  requireProof(p?.id===EXPECTED.vercelProjectId && p.name==='scout-stonk-intel' &&
    p.accountId===TEAM_ID && p.nodeVersion==='24.x' && p.ssoProtection?.enabled===true &&
    p.ssoProtection.deploymentType==='all_except_custom_domains');
  const aliases=completePage(raw.aliases,'aliases').map(a=>{
    requireProof(a.projectId===p.id && host(a.alias) && /^dpl_[a-zA-Z0-9]+$/.test(a.deploymentId));
    return {alias:a.alias,deploymentId:a.deploymentId};
  }).sort((a,b)=>a.alias.localeCompare(b.alias,'en'));
  unique(aliases,'alias');
  requireProof(PROTECTED_ALIASES.every(name=>aliases.some(a=>a.alias===name)));
  // The four production names must agree on one restored deployment at baseline.
  requireProof(new Set(aliases.filter(a=>PROTECTED_ALIASES.includes(a.alias)).map(a=>a.deploymentId)).size===1);
  const domains=completePage(raw.domains,'domains').map(d=>{
    requireProof(d.projectId===p.id && host(d.name));
    for(const k of ['gitBranch','customEnvironmentId','redirect'])
      requireProof(d[k]===null || typeof d[k]==='string');
    return {name:d.name,gitBranch:d.gitBranch,customEnvironmentId:d.customEnvironmentId,redirect:d.redirect};
  }).sort((a,b)=>a.name.localeCompare(b.name,'en'));
  unique(domains,'name');
  requireProof(['scout.storkcoin.xyz','scout-stonk-intel.vercel.app'].every(name=>
    domains.some(d=>d.name===name && d.gitBranch===null && d.customEnvironmentId===null && d.redirect===null)));
  const state={version:'scout-neon-alias-snapshot/1',project:{id:p.id,name:p.name,accountId:p.accountId,
    nodeVersion:p.nodeVersion,ssoProtection:{enabled:true,deploymentType:p.ssoProtection.deploymentType}},aliases,domains};
  return {...state,sha256:digest(state)};
}

export function verifySnapshot(s) {
  requireProof(s?.version==='scout-neon-alias-snapshot/1' && Array.isArray(s.aliases) && Array.isArray(s.domains));
  const rebuilt=snapshot({project:s.project,
    aliases:{aliases:s.aliases.map(a=>({...a,projectId:s.project.id})),pagination:{count:s.aliases.length,next:null}},
    domains:{domains:s.domains.map(d=>({...d,projectId:s.project.id})),pagination:{count:s.domains.length,next:null}}});
  requireProof(s.sha256===rebuilt.sha256);
  return rebuilt;
}
export function compareSnapshots(before,after) {
  const a=verifySnapshot(before),b=verifySnapshot(after);
  requireProof(a.sha256===b.sha256);
  return {unchanged:true,aliases:a.aliases.length,domains:a.domains.length,sha256:a.sha256};
}

function boundedJson(path) {
  const bytes=readFileSync(path);requireProof(bytes.length<=131072);
  return JSON.parse(bytes.toString('utf8'));
}
function main(args) {
  if(args[0]==='snapshot' && args.length===3) {
    const s=snapshot(boundedJson(args[1]));
    writeFileSync(args[2],JSON.stringify(s,null,2)+'\n',{flag:'wx',mode:0o600});
    console.log(JSON.stringify({snapshotReady:true,sha256:s.sha256,aliases:s.aliases.length,domains:s.domains.length}));
  } else if(args[0]==='compare' && args.length===3)
    console.log(JSON.stringify(compareSnapshots(boundedJson(args[1]),boundedJson(args[2]))));
  else throw Error('invalid_command');
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {main(process.argv.slice(2));}
  catch {console.error('FAIL: alias safety unproven; stop without deployment or invocation.');process.exitCode=1;}
}
