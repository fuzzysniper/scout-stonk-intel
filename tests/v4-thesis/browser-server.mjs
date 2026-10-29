// Test-only loopback server. No production auth, DSN, provider or secret loader.
import {createServer} from 'node:http';
import {readFileSync,copyFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';
import {Readable} from 'node:stream';
import {fixture} from './fixture.mjs';
const port=4288,origin='http://127.0.0.1:'+port,build=process.env.JOURNAL_BUILD;
mkdirSync(join(build,'app/lens'),{recursive:true});copyFileSync('app/lens/lens.module.css',join(build,'app/lens/lens.module.css'));
const require=createRequire(import.meta.url),w=require('next/dist/compiled/webpack/webpack');w.init();
await new Promise((ok,no)=>w.webpack({mode:'production',target:'web',entry:join(build,'tests/v4-thesis/browser-entry.js'),output:{path:join(build,'browser'),filename:'app.js'},resolve:{modules:[resolve('node_modules')],alias:{react:resolve('node_modules/react'),'react-dom':resolve('node_modules/react-dom')}},module:{rules:[{test:/\.css$/,use:[resolve('tests/v4-thesis/css-loader.cjs')]}]},optimization:{minimize:false}},(err,stats)=>err||stats.hasErrors()?no(Error('offline_browser_bundle_failed '+stats?.toString({all:false,errors:true}))):ok()));
const f=await fixture(origin),handler=f.makeHandler();
const html=cap=>'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SYNTHETIC local thesis QA</title><style>'+readFileSync('app/globals.css','utf8')+readFileSync('app/lens/lens.module.css','utf8')+'</style></head><body><div id="root"></div><script>window.__SYNTHETIC_CAPABILITY='+JSON.stringify(cap).replaceAll('<','\\u003c')+'</script><script src="/app.js"></script></body></html>';
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,origin);
  if(url.pathname==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(readFileSync(join(build,'browser/app.js')));return;}
  if(url.pathname==='/__synthetic/reset'){await f.reset();res.end('SYNTHETIC_FIXTURE_RESET_ONLY');return;}
  if(url.pathname==='/__synthetic/session'){
   const s=f.session();res.setHeader('Content-Type','application/json');res.end(JSON.stringify({cookie:s.id,csrf:s.csrf,expiresAtMs:s.context.expiresAtMs}));return;
  }
  if(url.pathname==='/__synthetic/revoke'){const cookie=req.headers.cookie?.split('=')[1];if(cookie&&f.sessions.has(cookie))f.sessions.get(cookie).revoked=true;res.end('SYNTHETIC_REVOKED');return;}
  if(url.pathname==='/lens'){
   const cookie=req.headers.cookie?.split('=')[1],s=cookie?f.sessions.get(cookie):null,cap=s&&!s.revoked?{kind:'verified_owner',csrfToken:s.csrf,expiresAtMs:s.context.expiresAtMs}:{kind:'off'};res.setHeader('Content-Type','text/html');res.setHeader('Cache-Control','no-store');res.end(html(cap));return;
  }
  const request=new Request(url,{method:req.method,headers:req.headers,...(req.method==='GET'||req.method==='HEAD'?{}:{body:Readable.toWeb(req),duplex:'half'})});
  const response=await handler(request);res.statusCode=response.status;for(const [k,v]of response.headers)res.setHeader(k,v);res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.statusCode=503;res.end('SYNTHETIC_TEST_UNAVAILABLE');}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
process.stdout.write('SYNTHETIC local journal browser server ready\n');
let closing=false;async function close(){if(closing)return;closing=true;server.closeAllConnections();await new Promise(r=>server.close(r));await f.close();process.exit(0);}
process.on('SIGTERM',()=>void close());process.on('SIGINT',()=>void close());
