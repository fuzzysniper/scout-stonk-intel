// SYNTHETIC auth sessions + generated ephemeral keys; actual LOCAL native TLS PG storage/rate.
import {createRequire} from 'node:module';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {mkdtempSync,readFileSync,chmodSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:net';
import {Pool} from 'pg';
import {localPostgres} from '../onchain-api/postgres-harness.mjs';
import {auth,keyring,PostgresJournalRepository,MINT} from '../v4-private-journal/fixtures.mjs';
const require=createRequire(import.meta.url),build=process.env.JOURNAL_BUILD;
export const {createThesisHandler}=require(join(build,'lib/v4-thesis-api/handler.js'));
export const {PostgresThesisRate}=require(join(build,'lib/v4-thesis-api/rate.js'));
export const {installedThesisRoute,THESIS_APPROVAL}=require(join(build,'lib/v4-thesis-api/installed.js'));
export {MINT};
export async function fixture(origin='http://127.0.0.1:4288'){
 const dir=mkdtempSync(join(tmpdir(),'thesis228-tls-')),key=join(dir,'ephemeral.key'),cert=join(dir,'ephemeral.crt');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=journal.synthetic.invalid','-addext','subjectAltName=DNS:journal.synthetic.invalid','-keyout',key,'-out',cert],{stdio:'ignore'});chmodSync(key,0o600);
 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 let db,pool;
 try{
  db=await localPostgres({tls:{port,cert,key}});await db.owner.query(readFileSync('lib/v4-private-journal/schema.sql','utf8'));await db.owner.query(readFileSync('lib/v4-thesis-api/rate.sql','utf8'));
  const password=randomBytes(24).toString('hex');await db.owner.query(`CREATE ROLE t228_app LOGIN PASSWORD '${password}';GRANT unfarmd_journal_app,unfarmd_thesis_rate_app TO t228_app`);
  const config={host:'127.0.0.1',port,user:'t228_app',password,database:'postgres',max:8,connectionTimeoutMillis:800,query_timeout:2200,ssl:{ca:readFileSync(cert,'utf8'),servername:'journal.synthetic.invalid',rejectUnauthorized:true},enableChannelBinding:true};pool=new Pool(config);pool.on('error',()=>{});const extraPools=[];
  const a=auth(),ring=keyring(),ownerId=randomUUID(),otherId=randomUUID(),sessions=new Map();
  const repository=new PostgresJournalRepository(pool,ring.keys,a.authority),rate=new PostgresThesisRate(pool,a.authority);
  const session=(owner=ownerId)=>{const id=randomBytes(24).toString('base64url'),csrf=randomBytes(24).toString('base64url'),expiresAtMs=Date.now()+240000,principal=a.principal(owner);const context=Object.freeze({principal,sessionTag:id,expiresAtMs});const s={id,csrf,owner,context,revoked:false};sessions.set(id,s);return s;};
  const owners={async resolve(req){const cookie=req.headers.get('cookie')??'',match=/^synthetic_thesis=([A-Za-z0-9_-]+)$/.exec(cookie),s=match?sessions.get(match[1]):null;return s&&!s.revoked&&s.owner===ownerId?s.context:null;},
   async verifyCsrf(req,ctx){const s=sessions.get(ctx.sessionTag),token=req.headers.get('x-csrf-token')??'';return !!s&&token.length===s.csrf.length&&timingSafeEqual(Buffer.from(token),Buffer.from(s.csrf));},
   async isCurrent(ctx){const s=sessions.get(ctx.sessionTag);return !!s&&!s.revoked&&s.owner===ownerId&&s.context===ctx&&Date.now()<ctx.expiresAtMs;}};
  const makeHandler=(overrides={})=>createThesisHandler({origin,owners,authority:a.authority,repository,rate,...overrides});
  return {db,pool,ownerId,otherId,sessions,session,owners,repository,rate,authority:a.authority,ring,makeHandler,
   reopenRate(){const p=new Pool(config);p.on('error',()=>{});extraPools.push(p);return new PostgresThesisRate(p,a.authority);},
   async reset(){await db.owner.query('TRUNCATE unfarmd_journal.owners CASCADE;TRUNCATE unfarmd_thesis_rate.usage');sessions.clear();},
   async close(){await Promise.all(extraPools.map(p=>p.end()));await pool.end();await db.close();rmSync(dir,{recursive:true,force:true});}};
 }catch(e){await pool?.end();await db?.close();rmSync(dir,{recursive:true,force:true});throw e;}
}
export const createBody=()=>({journalId:randomUUID(),mint:MINT,requestId:randomUUID(),thesis:'SYNTHETIC ONLY original hypothesis',invalidation:null});
export function request(session,path='/api/v4/theses',method='GET',data,headers={}){
 return new Request('http://127.0.0.1:4288'+path,{method,headers:{...(session?{Cookie:'synthetic_thesis='+session.id,'X-CSRF-Token':session.csrf}:{}),Origin:'http://127.0.0.1:4288','X-UNFARMD-V4-OWNER-INTENT':'journal','Sec-Fetch-Site':'same-origin',...(data===undefined?{}:{'Content-Type':'application/json'}),...headers},...(data===undefined?{}:{body:typeof data==='string'?data:JSON.stringify(data)})});
}
