/** Bounded GET-only release evidence. Network failures never become application success or defect claims. */
import { validateEdition, canonical, sha, graceAt, hex } from '../lib/archive';
import { validBriefDate } from '../lib/brief';
export type Evidence = { level:'PASS'|'WARN'|'FAIL'; code:string; url:string; at:string; status?:number; note:string };
export type Verification = { target:'production'|'preview'; base:string; startedAt:string; finishedAt:string; outcome:'pass'|'incomplete'|'fail'; exitCode:0|1|2; evidence:Evidence[]; scope:string };
export type Options = { base:string; target:'production'|'preview'; date:string; expectedId:string };
const RAW='https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/';
export function validateOptions(options:Options,now=new Date()) {
 const u=new URL(options.base);
 if(u.username||u.password||u.search||u.hash||u.pathname!=='/'||!['production','preview'].includes(options.target)||
  (u.protocol!=='https:' && !(options.target==='preview'&&u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname)))||
  !validBriefDate(options.date,now)||!hex(options.expectedId))throw Error('invalid_verification_target');
 return u.origin;
}
export function classifyStatus(status:number):string {
 return status===503?'application_source_unavailable':status===404?'application_not_found':status===409?'application_revision_conflict':
  status===401||status===403?'http_access_restricted':'application_http_response';
}
function redirectLocation(status:number,headers:Headers,bytes:Buffer):string|null {
 if([301,302,303,307,308].includes(status))return headers.get('location');
 if(status!==200)return null;
 const tag=[...bytes.toString('utf8').matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]).find(t=>/http-equiv=["']refresh["']/i.test(t));
 return /content=["']\s*[0-5]\s*;\s*url=([^"']+)["']/i.exec(tag??'')?.[1]??null;
}
export async function verifyRelease(options:Options,fetcher:typeof fetch=fetch,clock:()=>Date=()=>new Date()):Promise<Verification>{
 const base=validateOptions(options,clock()),startedAt=clock().toISOString(),evidence:Evidence[]=[];
 const add=(level:Evidence['level'],code:string,url:string,note:string,status?:number)=>evidence.push({level,code,url,at:clock().toISOString(),...(status===undefined?{}:{status}),note});
 async function read(url:string,limit=5*1024*1024){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
   const r=await fetcher(url,{method:'GET',redirect:'manual',cache:'no-store',signal:controller.signal,headers:{accept:'application/json,text/html,image/png', 'user-agent':'SCOUT-ReadOnly-Release-Verification/1.0'}});
   if(r.headers.has('x-mitmproxy-blocked-reason')){add('WARN','network_policy_blocked',url,'Proxy policy denied access; application was not verified.',r.status);return null;}
   const reader=r.body?.getReader(),chunks:Uint8Array[]=[];let size=0;
   if(reader){try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw Error('oversized_response');chunks.push(value);}}finally{await reader.cancel();}}
   return {status:r.status,headers:r.headers,bytes:Buffer.concat(chunks),url};
  }catch(e){const oversized=e instanceof Error&&e.message==='oversized_response';add(oversized?'FAIL':'WARN',oversized?'oversized_response':'host_or_network_unreachable',url,oversized?'Response exceeded the bounded evidence limit.':'No valid application response: DNS, TLS, timeout, proxy or connection failure. No provider error/body/credential is printed.');return null;}
  finally{clearTimeout(timer);controller.abort();}
 }
 function expected(r:Awaited<ReturnType<typeof read>>,url:string,status:number,code:string){
  if(!r)return false;
  if(r.status===status){add('PASS',code,url,'Expected application HTTP response.',r.status);return true;}
  const warn=[401,403,503].includes(r.status);
  add(warn?'WARN':'FAIL',classifyStatus(r.status),url,`Expected HTTP ${status}; actual application/access response is preserved, not called an unreachable host.`,r.status);return false;
 }
 const path='/brief/'+options.date+'/editions/'+options.expectedId,canonicalUrl=base+'/brief/'+options.date;
 const canonicalRead=await read(canonicalUrl);
 // A refused host gets one probe; do not manufacture successful checks or repeat many timeouts.
 if(canonicalRead){
  const canonicalLocation=redirectLocation(canonicalRead.status,canonicalRead.headers,canonicalRead.bytes);
  if(canonicalLocation){
   let dest:URL|null=null;try{dest=new URL(canonicalLocation,base);}catch{}
   add(dest?.origin===base&&dest.pathname===path&&!dest.search&&!dest.hash&&!dest.username&&!dest.password?'PASS':'FAIL','canonical_archived_redirect',canonicalUrl,canonicalRead.status===200?'Exact original edition in server-streamed HTML redirect; browser navigation still needs QA.':'Exact original edition HTTP redirect; no redirect followed automatically.',canonicalRead.status);
  }else if(canonicalRead.status===200){add('FAIL','canonical_not_archived_redirect',canonicalUrl,'Received HTML without the required archive redirect; this does not identify the underlying application or hosting cause.',200);}
  else expected(canonicalRead,canonicalUrl,307,'canonical_archived_redirect');
  const pageUrl=base+path,page=await read(pageUrl);
  let imagePath:string|null=null;
  if(expected(page,pageUrl,200,'edition_html')){
   const html=page!.bytes.toString('utf8');
   const tags=[...html.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map(m=>m[0]);
   const attr=(tag:string,key:string)=>new RegExp('\\b'+key+'=["\\\']([^"\\\']*)["\\\']','i').exec(tag)?.[1];
   const canonicalTag=tags.find(t=>attr(t,'rel')==='canonical'),og=tags.find(t=>attr(t,'property')==='og:image');
   try{
    const c=new URL(attr(canonicalTag??'','href')??'',base),image=new URL(attr(og??'','content')??'',base);
    const allowedOrigins=options.target==='preview'?[base,'https://scout.storkcoin.xyz']:[base];
    const good=!!canonicalTag&&!!og&&allowedOrigins.includes(c.origin)&&allowedOrigins.includes(image.origin)&&!c.username&&!c.password&&!image.username&&!image.password&&c.pathname===path&&image.pathname===path+'/opengraph-image';
    add(good?'PASS':'FAIL','edition_share_metadata',pageUrl,'Checks date/ID canonical and Open Graph image paths, not physical-phone rendering. Preview may deliberately use production metadata origin.');
    if(good)imagePath=image.pathname+image.search;
   }catch{add('FAIL','invalid_share_metadata',pageUrl,'Missing or malformed canonical/Open Graph metadata.');}
  }
  if(imagePath){const imageUrl=base+imagePath,image=await read(imageUrl,2*1024*1024);if(expected(image,imageUrl,200,'edition_share_png'))add(image!.headers.get('content-type')?.startsWith('image/png')&&image!.bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'PASS':'FAIL','png_signature',imageUrl,'Bounded share preview has PNG media type and signature.');}
  const apiUrl=base+'/api/archive?date='+options.date+'&id='+options.expectedId,api=await read(apiUrl);
  if(expected(api,apiUrl,200,'archive_api')){
   try{
    const payload=JSON.parse(api!.bytes.toString('utf8')),edition=validateEdition(payload.edition),report=payload.report;
    const rowFacts=report.rows.map((row:Record<string,unknown>)=>{const {evidence:links,...facts}=row;void links;return facts;});
    if(edition.id!==options.expectedId||edition.body.date!==options.date||report.provisional!==false||report.version!==edition.id||report.sharePath!==path||report.headline!==edition.body.headline||report.findingCount!==edition.body.findingCount||report.verifiedCount!==edition.body.verifiedCount||report.publication?.id!==edition.id||report.publication?.method!==edition.body.method||report.dataset?.revision!==edition.body.snapshotRevision||report.dataset?.source!==edition.body.source||canonical(rowFacts)!==canonical(edition.body.rows))throw Error('report_mismatch');
    add('PASS','edition_hash_and_claims',apiUrl,'Canonical edition hash, method, preserved source hashes and API claims independently reproduce.');
    add(clock().getTime()>=graceAt(options.date)&&edition.body.eligibleAt===new Date(graceAt(options.date)).toISOString()?'PASS':'FAIL','utc_grace',apiUrl,'Day closure plus three-hour grace checked; eligibleAt is not a fake publication timestamp.');
    add(api!.headers.get('cache-control')?.includes('no-store')?'PASS':'FAIL','api_no_store',apiUrl,'Archive API transport metadata stays separate from immutable body.');
    const snapshotUrl=RAW+edition.body.inputCommit+'/data/reward-snapshots.json',allowlistUrl=RAW+edition.body.inputCommit+'/data/tracked-mints.json';
    for(const [url,revision,limit] of [[snapshotUrl,edition.body.snapshotRevision,2*1024*1024],[allowlistUrl,edition.body.allowlistRevision,65536]] as const){
     const source=await read(url,limit);if(source?.status===200)add('sha256:'+sha(source.bytes)===revision?'PASS':'FAIL','pinned_source_hash',url,'Compare actual pinned GitHub bytes with preserved evidence revision.',200);
     else if(source)add('WARN','pinned_source_unavailable',url,'Source response exists, but independent provenance is unverified; saved evidence alone is not live source access proof.',source.status);
    }
   }catch{add('FAIL','edition_or_report_tampering',apiUrl,'Invalid, unsupported or nonreproducible edition/report. No received body or arbitrary exception is printed.');}
  }
  const beforeToday=clock().toISOString().slice(0,10),todayUrl=base+'/brief',today=await read(todayUrl),afterToday=clock().toISOString().slice(0,10);
  const todayLocation=today?redirectLocation(today.status,today.headers,today.bytes):null;
  if(today&&todayLocation){
   let dest:URL|null=null;try{dest=new URL(todayLocation,base);}catch{}
   add(dest?.origin===base&&[beforeToday,afterToday].some(date=>dest!.pathname==='/brief/'+date)&&!dest.search&&!dest.hash&&!dest.username&&!dest.password?'PASS':'FAIL','utc_today_redirect',todayUrl,'Accept only UTC date before/after this bounded request, including midnight rollover.',today.status);
  }else if(today)expected(today,todayUrl,307,'utc_today_redirect');
  const statusUrl=base+'/status',status=await read(statusUrl);if(expected(status,statusUrl,200,'status_html'))add(status!.bytes.toString('utf8').includes('Data Health')?'PASS':'FAIL','status_markup',statusUrl,'HTML route checked; client hydration, touch and native sharing require separate browser/phone QA.');
  const healthUrl=base+'/api/status',health=await read(healthUrl);if(expected(health,healthUrl,200,'status_api')){
   try{const value=JSON.parse(health!.bytes.toString('utf8'));if(!Array.isArray(value.rows)||!value.archive||!['available','source_unavailable','awaiting_publication_or_review'].includes(value.archive.state))throw Error('invalid');add(value.archive.state==='source_unavailable'?'WARN':'PASS','archive_health',healthUrl,'Current archive source state recorded separately from frozen daily claims.');}catch{add('FAIL','invalid_status_response',healthUrl,'Malformed status JSON; no response body printed.');}
  }
  for(const [url,status,code] of [
   [base+'/api/archive?date=2026-02-30',400,'invalid_date_rejected'],
   [base+'/api/archive?date='+options.date+'&id='+'0'.repeat(64),404,'missing_edition_not_replaced'],
   [base+'/api/brief?date='+options.date+'&v='+'0'.repeat(64),409,'outdated_version_not_replaced'],
  ] as const){const r=await read(url);if(expected(r,url,status,code)&&status!==400){try{const b=JSON.parse(r!.bytes.toString('utf8'));add(!b.rows&&!b.report&&!b.edition?'PASS':'FAIL','failure_has_no_replacement_claims',url,'Failure response contains no substituted financial rows.');}catch{add('FAIL','invalid_failure_json',url,'Failure response was not JSON.');}}}
 }
 const outcome=evidence.some(e=>e.level==='FAIL')?'fail':evidence.some(e=>e.level==='WARN')?'incomplete':'pass';
 return {target:options.target,base,startedAt,finishedAt:clock().toISOString(),outcome,exitCode:outcome==='pass'?0:outcome==='fail'?1:2,evidence,
  scope:'Read-only HTTP/JSON/hash/metadata verification. No JavaScript interaction, physical-phone, workflow execution or publication approval proof.'};
}
async function main(){
 const args=process.argv.slice(2),values=new Map<string,string>();
 for(let i=0;i<args.length;i+=2){if(!['--base','--target','--date','--id'].includes(args[i])||!args[i+1]||values.has(args[i]))throw Error('invalid_arguments');values.set(args[i],args[i+1]);}
 const options:Options={base:values.get('--base')??'https://scout.storkcoin.xyz',target:(values.get('--target')??'production') as Options['target'],date:values.get('--date')??'2026-10-11',expectedId:values.get('--id')??'d3a23a36ef05a3c3f0ab4fdaf94b000aaed24fe70c945607a97a50da7dde6f63'};
 const result=await verifyRelease(options);console.log(JSON.stringify(result,null,2));process.exitCode=result.exitCode;
}
if(require.main===module)void main().catch(()=>{console.error('FAIL invalid_verification_arguments_or_runtime; no application success claimed');process.exitCode=1;});
