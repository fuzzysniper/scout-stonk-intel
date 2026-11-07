// SYNTHETIC PRIVATE CONTROL PLANE / CREDENTIAL STRINGS / TLS TRANSCRIPT.
// NO real owner review, deployment, TLS, provider request or database acceptance.
import https from 'node:https';import {EventEmitter} from 'node:events';
import {fixture as original,load,require,canonical,hash} from '../native-admission/fixtures.mjs';
export {load,require,canonical,hash};
export function synthetic(){
 const f=original(),now=Date.now();f.now=now;Object.assign(f.p,{startsAt:now-1000,expiresAt:now+899000,branch:'native-pilot/private-beta-rc'});Object.assign(f.identity,{branch:f.p.branch});f.plan.branch=f.p.branch;
 Object.assign(f.setup,{startsAt:now-5000,expiresAt:now+86395000});f.setup.database.observedAt=f.setup.checkpoint.observedAt=now-1000;
 const ca='-----BEGIN CERTIFICATE-----\nSYNTHETIC NOT A REAL CA\n-----END CERTIFICATE-----',secret='SYNTHETIC_AUTH_SECRET_'.repeat(4),key=Buffer.alloc(32,7);
 f.setup.database.caSha256=hash(ca);f.setup.owner.authSecretSha256=hash(secret);f.setup.checkpoint.keySha256=hash(key);
 Object.assign(f.source,{startsAt:f.p.startsAt,expiresAt:f.p.expiresAt});
 const evidence=f.evidence;f.evidence=(stage,record)=>{const e=evidence(stage,record);e.run.created_at=new Date(now-4000).toISOString();e.run.updated_at=new Date(now-100).toISOString();return e;};
 f.values={ca,secret,key,providerKey:'SYNTHETIC_HELIUS_KEY_NEVER_SENT_000'};f.p.keySha256=hash(f.values.providerKey);
 f.rehash=()=>{f.source.setupSha256=hash(canonical(f.setup));f.source.policySha256=hash(canonical(f.p));};f.rehash();return f;
}
export function installSyntheticBindings(f,{breakSource=false}={}){
 const oldEnv=process.env,oldRequest=https.request;let credentialReads=[],reads=[];
 globalThis.__UNFARMD_NATIVE_INSTALLED__=true;globalThis.__UNFARMD_NATIVE_CONTROL_PLAN__=f.plan;globalThis.__UNFARMD_RESEARCH_BUILD__={commit:f.p.commit,tree:f.p.tree};
 const dsn=role=>`postgresql://${role}:SYNTHETIC_PASSWORD@${f.setup.database.host}/unfarmd_v4_pilot?sslmode=verify-full&channel_binding=require`;
 const values={...oldEnv,VERCEL:'1',VERCEL_ENV:'preview',VERCEL_PROJECT_ID:f.p.project,VERCEL_GIT_PROVIDER:'github',VERCEL_GIT_REPO_OWNER:'fuzzysniper',VERCEL_GIT_REPO_SLUG:'scout-stonk-intel',VERCEL_GIT_COMMIT_SHA:f.p.commit,VERCEL_GIT_COMMIT_REF:f.p.branch,VERCEL_DEPLOYMENT_ID:f.p.deployment,VERCEL_URL:new URL(f.p.origin).hostname,
  UNFARMD_NATIVE_GITHUB_READ_TOKEN:'SYNTHETIC_READ_ONLY_GITHUB_TOKEN_000',UNFARMD_NATIVE_PG_CA:f.values.ca,UNFARMD_NATIVE_AUTH_SECRET:f.values.secret,UNFARMD_NATIVE_AUTH_READER_DSN:dsn('unfarmd_v4_auth_login'),UNFARMD_NATIVE_AUTH_ISSUER_DSN:dsn('unfarmd_v4_issuer_login'),UNFARMD_NATIVE_PG_DSN:dsn('unfarmd_native_login'),UNFARMD_NATIVE_STOPPER_DSN:dsn('unfarmd_native_stopper_login'),UNFARMD_NATIVE_CHECKPOINT_KEY:f.values.key.toString('base64url'),UNFARMD_NATIVE_HELIUS_KEY:f.values.providerKey};
 process.env=new Proxy(values,{get(t,k){if(String(k).startsWith('UNFARMD_NATIVE_'))credentialReads.push(k);return Reflect.get(t,k);}});
 const {listingPath,configurationPath,evidencePaths}=load('github');
 https.request=(o,callback)=>{if(o.hostname!=='api.github.com'||o.method!=='GET')throw Error('NO_REAL_NETWORK_PERMITTED');const responses=new Map();
  for(const stage of ['setup','source']){const record=f[stage],pub=f.publication(stage,record);if(stage==='source')pub.id++;responses.set(listingPath(stage,f.context),[pub]);responses.set(configurationPath(stage,f.context),f.configuration(stage,record));const e=structuredClone(f.evidence(stage,record));if(stage==='source'&&breakSource)e.reviews[0].user.id++;for(const[k,url]of Object.entries(evidencePaths(record,stage,pub)))responses.set(url,e[k]);}
  if(!responses.has(o.path))throw Error('SYNTHETIC_UNEXPECTED_METADATA_PATH');reads.push(o.path);const q=new EventEmitter();q.destroy=()=>q.destroyed=true;q.end=()=>queueMicrotask(()=>{const socket=new EventEmitter();Object.assign(socket,{encrypted:true,authorized:true,servername:'api.github.com',getProtocol:()=> 'TLSv1.3',getPeerCertificate:()=>({subjectaltname:'DNS:api.github.com',subject:{CN:'api.github.com'}})});q.emit('socket',socket);socket.emit('secureConnect');if(q.destroyed)return;const r=new EventEmitter();Object.assign(r,{statusCode:200,headers:{'content-type':'application/json'},complete:true,destroy(){this.destroyed=true;}});callback(r);if(!r.destroyed){r.emit('data',Buffer.from(JSON.stringify(responses.get(o.path))));r.emit('end');}});return q;
 };
 return {values,reads,credentialReads,restore(){process.env=oldEnv;https.request=oldRequest;delete globalThis.__UNFARMD_NATIVE_INSTALLED__;delete globalThis.__UNFARMD_NATIVE_CONTROL_PLAN__;delete globalThis.__UNFARMD_RESEARCH_BUILD__;}};
}
export function request(f,intent='inspect',extra={}){return new Request(f.p.origin+'/api/native-pilot',{method:'POST',headers:{origin:f.p.origin,'sec-fetch-site':'same-origin','content-type':'application/json','x-unfarmd-native-intent':intent,...extra},body:canonical({mint:f.p.mint})});}
