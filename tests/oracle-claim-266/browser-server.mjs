// Loopback-only synthetic QA. No real source, owner, credential or DB operation.
import {createServer} from 'node:http';import {readFileSync,copyFileSync,mkdirSync} from 'node:fs';import {createRequire} from 'node:module';import {join,resolve} from 'node:path';
import {scenario,MINT} from './fixtures.mjs';
const build=process.env.ORACLE_CLAIM_BUILD,load=createRequire(import.meta.url),w=load('next/dist/compiled/webpack/webpack');w.init();
mkdirSync(join(build,'app/lens'),{recursive:true});copyFileSync('app/lens/ca-view.module.css',join(build,'app/lens/ca-view.module.css'));
await new Promise((ok,no)=>w.webpack({mode:'production',target:'web',entry:join(build,'tests/oracle-claim-266/browser-entry.js'),output:{path:join(build,'claim-browser'),filename:'app.js'},resolve:{modules:[resolve('node_modules')],alias:{react:resolve('node_modules/react'),'react-dom':resolve('node_modules/react-dom')}},module:{rules:[{test:/\.css$/,use:[resolve('tests/v4-thesis/css-loader.cjs')]}]},optimization:{minimize:false}},(e,s)=>e||s.hasErrors()?no(Error('local_bundle_failed')):ok()));
let mode='provider',market=0,native=0,stop=0,owner=0;
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1:3868');res.setHeader('Cache-Control','no-store');
 if(u.pathname==='/__mode'){mode=u.searchParams.get('mode')??'provider';market=native=stop=owner=0;return res.end('LOCAL_ONLY');}
 if(u.pathname==='/__counts')return res.end(JSON.stringify({market,native,stop,owner}));
 if(u.pathname==='/api/v4/native-owner/status'){owner++;res.setHeader('content-type','application/json');return res.end('{"status":"signed_in"}');}
 if(u.pathname==='/api/v4/native-mint'){let text='';for await(const c of req)text+=c;const p=JSON.parse(text);res.setHeader('content-type','application/json');if(p.action==='stop'){stop++;return res.end('{"version":"oracle-native-session/1","outcome":"stopped","view":null,"details":null}');}native++;return res.end('{"version":"oracle-native-session/1","outcome":"unavailable","view":null,"details":null}');}
 if(u.pathname==='/api/v4/ca-intelligence'&&req.method==='POST'){let text='';for await(const c of req){text+=c;if(text.length>256)throw Error('size');}const p=JSON.parse(text);if(p.mint!==MINT||p.action!=='inspect'||req.headers['x-unfarmd-ca-intent']!=='inspect')throw Error('input');market++;res.setHeader('content-type','application/json');return res.end(JSON.stringify(await scenario(mode)));}
 if(u.pathname==='/app.js'){res.setHeader('content-type','text/javascript');return res.end(readFileSync(join(build,'claim-browser/app.js')));}
 if(u.pathname==='/lens'){res.setHeader('content-type','text/html');return res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LOCAL SYNTHETIC CLAIM QA</title><style>${readFileSync('app/globals.css','utf8')}${readFileSync('app/lens/ca-view.module.css','utf8')}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>`);}
 res.statusCode=404;res.end('LOCAL_NOT_FOUND');
 }catch{res.statusCode=400;res.end('LOCAL_BAD_REQUEST');}});
await new Promise((ok,no)=>{server.once('error',no);server.listen(3868,'127.0.0.1',ok);});console.log('LOCAL SYNTHETIC claim QA ready');
const close=()=>{server.closeAllConnections();server.close(()=>process.exit(0));};process.on('SIGTERM',close);process.on('SIGINT',close);
