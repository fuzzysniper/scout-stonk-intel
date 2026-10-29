// TEST ONLY. Real signed cookie and J crypto/SQL via two unselected app instances.
import {createServer} from 'node:https';
import {readFileSync,copyFileSync,mkdirSync,mkdtempSync,rmSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';import {join,resolve} from 'node:path';import {Readable} from 'node:stream';
import {fixture,MINT} from './fixture.mjs';
const origin='https://localhost',build=process.env.JOURNAL_BUILD;
mkdirSync(join(build,'app/lens'),{recursive:true});copyFileSync('app/lens/lens.module.css',join(build,'app/lens/lens.module.css'));
const load=createRequire(import.meta.url),w=load('next/dist/compiled/webpack/webpack');w.init();
await new Promise((ok,no)=>w.webpack({mode:'production',target:'web',entry:join(build,'tests/v4-thesis/browser-entry.js'),output:{path:join(build,'browser'),filename:'app.js'},resolve:{modules:[resolve('node_modules')],alias:{react:resolve('node_modules/react'),'react-dom':resolve('node_modules/react-dom')}},module:{rules:[{test:/\.css$/,use:[resolve('tests/v4-thesis/css-loader.cjs')]}]},optimization:{minimize:false}},(e,s)=>e||s.hasErrors()?no(Error('local_bundle_failed')):ok()));
let f=await fixture(origin),apps=[f.app(),f.app()],index=0;const sessions=new Map();let stop=f.producer(apps[0],()=>{throw Error('NO_SOURCE_WIRE');});
const dir=mkdtempSync(join(tmpdir(),'c237-browser-')),key=join(dir,'test.key'),cert=join(dir,'test.crt');execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost','-keyout',key,'-out',cert],{stdio:'ignore'});chmodSync(key,0o600);
const html=()=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LOCAL three-source strict package</title><style>${readFileSync('app/globals.css','utf8')}${readFileSync('app/lens/lens.module.css','utf8')}</style></head><body><div id="root"></div><script>fetch('/api/v4/theses?mint=${MINT}',{headers:{'X-UNFARMD-V4-OWNER-INTENT':'journal','X-SYNTHETIC-CSRF-PROPOSAL':'issue'},credentials:'same-origin'}).then(r=>r.json()).then(cap=>{window.__SYNTHETIC_CAPABILITY=cap;const s=document.createElement('script');s.src='/app.js';document.body.append(s)})</script></body></html>`;
const server=createServer({key:readFileSync(key),cert:readFileSync(cert)},async(req,res)=>{try{
 const url=new URL(req.url,origin);res.setHeader('Cache-Control','private, no-store');
 if(url.pathname==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(readFileSync(join(build,'browser/app.js')));return;}
 if(url.pathname==='/__synthetic/reset'){await f.close();f=await fixture(origin);apps=[f.app(),f.app()];stop=f.producer(apps[0],()=>{throw Error('NO_SOURCE_WIRE');});sessions.clear();res.end('LOCAL_RESET');return;}
 if(url.pathname==='/__synthetic/session'){const s=await f.session();sessions.set(s.cookie.split('=')[1],s);res.setHeader('Set-Cookie',s.cookie+'; Path=/; HttpOnly; Secure; SameSite=Strict');res.end('LOCAL_SIGNED_COOKIE');return;}
 if(url.pathname==='/__synthetic/revoke'){const value=req.headers.cookie?.split('=')[1],s=sessions.get(value);if(s)await f.db.owner.query('DELETE FROM public.v4_owner_session WHERE id=$1',[s.id]);res.end('LOCAL_REVOKED');return;}
 if(url.pathname==='/lens'){res.setHeader('Content-Type','text/html');res.end(html());return;}
 const request=new Request(url,{method:req.method,headers:req.headers,...(req.method==='GET'||req.method==='HEAD'?{}:{body:Readable.toWeb(req),duplex:'half'})}),app=apps[index++%2];
 if(req.headers['x-synthetic-csrf-proposal']==='issue'){
  const token=await app.bridge.issueCsrf(request);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(token?{kind:'verified_owner',...token}:{kind:'off'}));return;
 }
 if(url.pathname==='/__synthetic/status'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({state:await f.state(),source:await f.publicProducer(request)}));return;}
 const result=url.pathname==='/api/v4/helius-pilot'?(request.method==='POST'&&request.headers.get('x-unfarmd-v4-pilot-intent')==='stop'?Response.json(await stop(request)):Response.json(await f.publicProducer(request))):await app.handler(request);res.statusCode=result.status;for(const [k,v]of result.headers)res.setHeader(k,v);res.end(Buffer.from(await result.arrayBuffer()));
 }catch{res.statusCode=503;res.end('LOCAL_UNAVAILABLE');}});
await new Promise((ok,no)=>{server.once('error',no);server.listen(443,'localhost',ok);});process.stdout.write('LOCAL signed owner/J bridge ready\n');
let closing=false;async function close(){if(closing)return;closing=true;server.closeAllConnections();await new Promise(r=>server.close(r));await f.close();rmSync(dir,{recursive:true,force:true});process.exit(0);}process.on('SIGTERM',()=>void close());process.on('SIGINT',()=>void close());
