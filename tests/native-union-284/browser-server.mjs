// LOOPBACK ONLY. Actual B -> A -> existing C /lens, synthetic owner/identity/wire.
// File fixture ledger is real local fsync, NOT remote PG or hosted acceptance.
import {createServer} from 'node:http';import {readFileSync,copyFileSync,mkdirSync} from 'node:fs';import {createRequire} from 'node:module';import {join,resolve} from 'node:path';import {fileURLToPath} from 'node:url';
import {session,MINT} from './session.mjs';
export async function startBrowserHarness({makeSession=session,storageKind='historical-local-files',port=3896}={}){
const build=process.env.NATIVE_LENS_BUILD,load=createRequire(import.meta.url),w=load('next/dist/compiled/webpack/webpack');w.init();
mkdirSync(join(build,'app/lens'),{recursive:true});for(const f of ['ca-view.module.css','native-lens.module.css'])copyFileSync('app/lens/'+f,join(build,'app/lens',f));
await new Promise((ok,no)=>w.webpack({mode:'production',target:'web',entry:join(build,'tests/native-lens/browser-entry.js'),output:{path:join(build,'native-union-browser'),filename:'app.js'},resolve:{modules:[resolve('node_modules')],alias:{react:resolve('node_modules/react'),'react-dom':resolve('node_modules/react-dom')}},module:{rules:[{test:/\.css$/,use:[resolve('tests/v4-thesis/css-loader.cjs')]}]},optimization:{minimize:false}},(e,s)=>e||s.hasErrors()?no(Error('local_bundle_failed')):ok()));
let mode='sample',active=null,inspections=0,stops=0,lastState=null;
const server=createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://127.0.0.1:3896');res.setHeader('Cache-Control','no-store');
 if(u.pathname==='/__mode'){if(active)await active.close();mode=u.searchParams.get('mode')??'sample';active=null;inspections=stops=0;lastState=null;return res.end('LOCAL_SYNTHETIC_RESET_BY_TEST_DRIVER_ONLY');}
 if(u.pathname==='/__counts'){res.setHeader('content-type','application/json');return res.end(JSON.stringify({storageKind,inspections,stops,reads:active?.calls??0,state:lastState,receipts:active?.receipts??[]}));}
 if(u.pathname==='/api/native-pilot'&&req.method==='POST'){
  let text='';for await(const part of req){text+=part;if(text.length>256)throw Error('size');}const body=JSON.parse(text),intent=req.headers['x-unfarmd-native-intent'];
  if(Object.keys(body).sort().join(',')!=='mint'||body.mint!==MINT||!['inspect','stop'].includes(intent))throw Error('exact_input');
  res.setHeader('content-type','application/json');
  if(intent==='stop'){
   stops++;if(!active){res.statusCode=503;return res.end('{"error":"native_pilot_off"}');}
   const result=await active.storage.ledger.stop(active.time);lastState=await active.state();
   if(mode==='stop-ack-lost'){res.statusCode=503;return res.end('{"error":"LOCAL_SYNTHETIC_ACK_LOST"}');}
   if(mode==='stop-invalid-200')return res.end('{"ok":true}');
   return res.end(JSON.stringify({status:result.state.stopped?'stopped':'held',activate:false}));
  }
  inspections++;if(mode==='off'){res.statusCode=503;return res.end('{"error":"native_pilot_off"}');}
  if(!active)active=await makeSession(mode==='stop-ack-lost'||mode==='stop-invalid-200'?'sample':mode);
  // There is only ONE synthetic policy. Clear/replay cannot mint another budget.
  const result=await active.run();try{lastState=await active.state();}catch{lastState=null;}
  if(result.status!=='candidate'){res.statusCode=503;return res.end('{"error":"native_pilot_held"}');}
  return res.end(JSON.stringify(result.evidence));
 }
 if(u.pathname==='/app.js'){res.setHeader('content-type','text/javascript');return res.end(readFileSync(join(build,'native-union-browser/app.js')));}
 if(u.pathname==='/lens'){res.setHeader('content-type','text/html');return res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LOCAL SYNTHETIC ACTUAL NATIVE UNION</title><style>${readFileSync('app/globals.css','utf8')}${readFileSync('app/lens/ca-view.module.css','utf8')}${readFileSync('app/lens/native-lens.module.css','utf8')}</style></head><body>${storageKind==='actual-postgres-18'?'<p style="background:#e8eeee;color:#111;padding:8px;margin:0;font-size:12px">ACTUAL DISPOSABLE PG18 · SYNTHETIC OWNER / WIRE · NO LIVE SOURCE</p>':''}<div id="root"></div><script src="/app.js"></script></body></html>`);}
 res.statusCode=404;res.end('LOCAL_NOT_FOUND');
 }catch{res.statusCode=400;res.end('LOCAL_BAD_REQUEST');}});
await new Promise((ok,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',ok);});
return {async close(){if(active)await active.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const harness=await startBrowserHarness();console.log('LOCAL SYNTHETIC actual B/A/C non-SQL fixture harness ready; not PG evidence');
 const close=async()=>{await harness.close();process.exit(0);};process.on('SIGTERM',()=>void close());process.on('SIGINT',()=>void close());
}
