// OFFLINE TESTS ONLY. Ephemeral synthetic key/token/actor; never an owner binding.
import {PUBLIC,WORKFLOW} from './app-proof.mjs';
export const FAKE_TOKEN='offline-c2-installation-token-sentinel';
export const FAKE_ACTOR='900000001';
let generated;
export async function syntheticKey(){const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const bytes=await crypto.subtle.exportKey('pkcs8',pair.privateKey);
 return '-----BEGIN '+'PRIVATE KEY-----\n'+Buffer.from(bytes).toString('base64')+'\n-----END '+'PRIVATE KEY-----';}
export function fakeKey(){return generated??=syntheticKey();}
let verificationKey;
async function validMockJwt(jwt){
 try{
  verificationKey??=(async()=>{
   const pem=await fakeKey(),bytes=Buffer.from(pem.split('\n')[1],'base64');
   const key=await crypto.subtle.importKey('pkcs8',bytes,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},true,['sign']);
   const {n,e}=await crypto.subtle.exportKey('jwk',key);
   return crypto.subtle.importKey('jwk',{kty:'RSA',n,e},{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  })();
  const [header,payload,signature,...extra]=jwt.split('.'),h=JSON.parse(Buffer.from(header,'base64url')),p=JSON.parse(Buffer.from(payload,'base64url')),now=Math.floor(Date.now()/1000);
  return !extra.length && h.alg==='RS256' && h.typ==='JWT' && p.iss===String(PUBLIC.app) && p.iat<=now && p.iat>=now-120 && p.exp>now && p.exp<=now+600 &&
   await crypto.subtle.verify('RSASSA-PKCS1-v1_5',await verificationKey,Buffer.from(signature,'base64url'),new TextEncoder().encode(header+'.'+payload));
 }catch{return false;}
}
export async function context(){
 const now=Date.now(),start=new Date(now-60000);start.setUTCMilliseconds(0);const end=new Date(now+480000);end.setUTCMilliseconds(0);
 const env={ACTIVATION:'disabled',APP_ID:String(PUBLIC.app),INSTALLATION_ID:String(PUBLIC.installation),REPOSITORY_ID:String(PUBLIC.repository),
  C2_ARMED:'true',C2_GATE_DISABLED_ATTESTED:'true',C2_APP_ACTOR_ID:FAKE_ACTOR,C2_INSTANCE_ID:'c2-'+'a'.repeat(40),C2_NOT_BEFORE:start.toISOString(),C2_EXPIRES_AT:end.toISOString(),APP_PRIVATE_KEY:await fakeKey()};
 return {env,event:{instanceId:env.C2_INSTANCE_ID,workflowName:WORKFLOW,createdAt:now},now};
}
export function responder(calls,mutate=()=>{}) {
 return async(input,init)=>{
  const request=input && typeof input.url==='string' && typeof input.headers?.get==='function'?input:new Request(input,init),url=new URL(request.url);
  const path=url.pathname+url.search;calls.push({method:request.method,path});
  if(url.origin!=='https://api.github.com' || !request.headers.get('authorization')?.startsWith('Bearer '))throw Error('offline_outbound_forbidden');
  const token=request.headers.get('authorization').slice(7);
  if(path==='/app' || path.startsWith('/app/installations/')){
   if(!await validMockJwt(token))return new Response(null,{status:401});
  }else if(token!==FAKE_TOKEN)throw Error('offline_token_mismatch');
  let data,status=200;
  if(path==='/app')data={id:PUBLIC.app,slug:'offline-scout',owner:{id:PUBLIC.owner,login:'fuzzysniper'},permissions:{actions:'write',metadata:'read'}};
  else if(path===`/app/installations/${PUBLIC.installation}`)data={id:PUBLIC.installation,app_id:PUBLIC.app,account:{id:PUBLIC.owner,login:'fuzzysniper'},repository_selection:'selected',suspended_at:null,permissions:{actions:'write',metadata:'read'}};
  else if(path===`/app/installations/${PUBLIC.installation}/access_tokens` && request.method==='POST'){
   const body=await request.json();if(JSON.stringify(body)!==JSON.stringify({repository_ids:[PUBLIC.repository],permissions:{actions:'read'}}))throw Error('offline_write_scope_forbidden');
   data={token:FAKE_TOKEN,expires_at:new Date(Date.now()+3600000).toISOString(),permissions:{actions:'read',metadata:'read'}};status=201;
  }else if(path==='/installation/repositories?per_page=2')data={total_count:1,repositories:[{id:PUBLIC.repository,full_name:'fuzzysniper/scout-stonk-intel',default_branch:'main'}]};
  else if(path==='/users/offline-scout%5Bbot%5D')data={id:Number(FAKE_ACTOR),login:'offline-scout[bot]',type:'Bot'};
  else if(path==='/repos/fuzzysniper/scout-stonk-intel/actions/workflows/reward-snapshots.yml')data={id:PUBLIC.workflow,path:'.github/workflows/reward-snapshots.yml',state:'active'};
  else if(path==='/installation/token' && request.method==='DELETE')status=204;
  else throw Error('offline_outbound_forbidden');
  const changed=await mutate({path,method:request.method,data,status,request});
  if(changed instanceof Response)return changed;
  if(changed){data=changed.data??data;status=changed.status??status;}
  return status===204?new Response(null,{status}):Response.json(data,{status});
 };
}
