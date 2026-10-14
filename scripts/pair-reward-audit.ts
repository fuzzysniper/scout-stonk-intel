/** Offline CLI. Reads the explicitly supplied documentary evidence, never HTTP. */
import { readFileSync } from 'node:fs';
import { auditPairRewards } from '../lib/pair-reward-audit';
import type { RewardAuditPacket } from '../lib/pair-reward-audit-contract';
type Capture = {path:string; status:number|null; capturedAt:string; body?:string; headers:Record<string,string>};
const file=process.argv[2];
if(!file || process.argv.length!==3)throw Error('Usage: pair-reward-audit <dated-evidence.json>');
const bytes=readFileSync(file);if(bytes.length>2*1024*1024)throw Error('Evidence exceeds 2 MiB');
const evidence=JSON.parse(bytes.toString('utf8')) as {asOf:string;quoteMints:string[];packets:Capture[]};
if(!Array.isArray(evidence.quoteMints) || evidence.quoteMints.length!==4 || new Set(evidence.quoteMints).size!==4 || !Array.isArray(evidence.packets) || evidence.packets.length>32)throw Error('Invalid bounded evidence');
const packet=(p:Capture):RewardAuditPacket=>({source:'https://www.stonkfun.xyz'+p.path,status:p.status,fetchedAt:new Date(p.capturedAt).toISOString(),body:p.body??null,ageSeconds:p.headers?.age==null?null:Number(p.headers.age)});
const registry=evidence.packets.find(p=>p.path==='/api/public/v1/pairs');
const reports=evidence.quoteMints.map(quoteMint=>{
 const catalog=evidence.packets.find(p=>p.path==='/api/public/v1/tokens?sort=marketCap&page=1&pageSize=25&quoteMint='+quoteMint);
 const mints=new Set<string>(catalog?.body?JSON.parse(catalog.body).data.tokens.filter((t:{mode:string})=>t.mode==='reward').slice(0,4).map((t:{mint:string})=>t.mint):[]);
 const rewards=evidence.packets.filter(p=>/^\/api\/v2\/tokens\/[^/]+\/rewards$/.test(p.path) && mints.has(p.path.split('/')[4]));
 return auditPairRewards({quoteMint,asOf:evidence.asOf,registry:registry?packet(registry):null,catalog:catalog?packet(catalog):null,rewards:rewards.map(packet)});
});
process.stdout.write(JSON.stringify({kind:'offline_dated_reward_audit',asOf:evidence.asOf,reports},null,2)+'\n');
