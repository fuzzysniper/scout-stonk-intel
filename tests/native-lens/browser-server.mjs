// LOCAL/SYNTHETIC only. ACTUAL A engine + ACTUAL C consumer. No provider source.
import {createServer} from 'node:http';import {readFileSync,copyFileSync,mkdirSync} from 'node:fs';import {createRequire} from 'node:module';import {join,resolve} from 'node:path';
import {engineScenario,MINT} from './browser-fixtures.mjs';
const build=process.env.NATIVE_LENS_BUILD,load=createRequire(import.meta.url);
// Deliberately no fixture-schema or mock-engine fallback. Missing A is a blocker.
const api=load(join(build,'lib/native-evidence/index.js'));
for(const f of ['analyzeNativeEvidence','qualifyHolderCapture','qualifyMintCapture'])if(typeof api[f]!=='function')throw Error('A_NATIVE_ENGINE_NOT_INTEGRATED');
const w=load('next/dist/compiled/webpack/webpack');w.init();mkdirSync(join(build,'app/lens'),{recursive:true});copyFileSync('app/lens/ca-view.module.css',join(build,'app/lens/ca-view.module.css'));copyFileSync('app/lens/native-lens.module.css',join(build,'app/lens/native-lens.module.css'));
await new Promise((ok,no)=>w.webpack({mode:'production',target:'web',entry:join(build,'tests/native-lens/browser-entry.js'),output:{path:join(build,'native-browser'),filename:'app.js'},resolve:{modules:[resolve('node_modules')],alias:{react:resolve('node_modules/react'),'react-dom':resolve('node_modules/react-dom')}},module:{rules:[{test:/\.css$/,use:[resolve('tests/v4-thesis/css-loader.cjs')]}]},optimization:{minimize:false}},(e,s)=>e||s.hasErrors()?no(Error('local_bundle_failed')):ok()));
let mode='sample',calls=0,stop=0;
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1:3894');res.setHeader('Cache-Control','no-store');
 if(u.pathname==='/__mode'){mode=u.searchParams.get('mode')??'sample';calls=stop=0;return res.end('LOCAL_ONLY');}
 if(u.pathname==='/__counts'){res.setHeader('content-type','application/json');return res.end(JSON.stringify({native:calls,stop}));}
 if(u.pathname==='/api/native-pilot'&&req.method==='POST'){let text='';for await(const c of req){text+=c;if(text.length>256)throw Error('size');}const p=JSON.parse(text);if(Object.keys(p).sort().join(',')!=='mint')throw Error('schema');res.setHeader('content-type','application/json');
  if(req.headers['x-unfarmd-native-intent']==='stop'){stop++;res.statusCode=503;return res.end('{"error":"native_pilot_off"}');}
  if(p.mint!==MINT||req.headers['x-unfarmd-native-intent']!=='inspect')throw Error('input');calls++;if(mode==='off'){res.statusCode=503;return res.end('{"error":"native_pilot_off"}');}return res.end(JSON.stringify(await engineScenario(api,mode)));
 }
 if(u.pathname==='/app.js'){res.setHeader('content-type','text/javascript');return res.end(readFileSync(join(build,'native-browser/app.js')));}
 if(u.pathname==='/lens'){res.setHeader('content-type','text/html');return res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LOCAL SYNTHETIC NATIVE ORACLE</title><style>${readFileSync('app/globals.css','utf8')}${readFileSync('app/lens/ca-view.module.css','utf8')}${readFileSync('app/lens/native-lens.module.css','utf8')}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>`);}
 res.statusCode=404;res.end('LOCAL_NOT_FOUND');
 }catch{res.statusCode=400;res.end('LOCAL_BAD_REQUEST');}});
await new Promise((ok,no)=>{server.once('error',no);server.listen(3894,'127.0.0.1',ok);});console.log('LOCAL SYNTHETIC native lens with ACTUAL A engine ready');
const close=()=>{server.closeAllConnections();server.close(()=>process.exit(0));};process.on('SIGTERM',close);process.on('SIGINT',close);
