// Loopback-only UI fixture HTTP. No real provider/auth/DB/source operations.
import {createServer} from 'node:http';import {readFileSync,copyFileSync,mkdirSync} from 'node:fs';import {createRequire} from 'node:module';import {join,resolve} from 'node:path';
import {ownerShape,inspection} from './fixtures.mjs';
const build=process.env.ORACLE_LENS_BUILD,load=createRequire(import.meta.url),w=load('next/dist/compiled/webpack/webpack');w.init();
mkdirSync(join(build,'app/lens'),{recursive:true});copyFileSync('app/lens/ca-view.module.css',join(build,'app/lens/ca-view.module.css'));
await new Promise((ok,no)=>w.webpack({mode:'production',target:'web',entry:join(build,'tests/oracle-v5/browser-entry.js'),output:{path:join(build,'browser'),filename:'app.js'},resolve:{modules:[resolve('node_modules')],alias:{react:resolve('node_modules/react'),'react-dom':resolve('node_modules/react-dom')}},module:{rules:[{test:/\.css$/,use:[resolve('tests/v4-thesis/css-loader.cjs')]}]},optimization:{minimize:false}},(e,s)=>e||s.hasErrors()?no(Error('local_bundle_failed')):ok()));
let mode='owner';
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1:3861');res.setHeader('Cache-Control','no-store');
 if(u.pathname==='/__fixture/mode'){mode=u.searchParams.get('mode')??'owner';return res.end('LOCAL_ONLY');}
 if(u.pathname==='/app.js'){res.setHeader('content-type','text/javascript');return res.end(readFileSync(join(build,'browser/app.js')));}
 if(u.pathname==='/api/v4/ca-intelligence'&&req.method==='POST'){let body='';for await(const p of req){body+=p;if(body.length>256)throw Error('size');}const o=JSON.parse(body);if(o.action!=='inspect'||req.headers['x-unfarmd-ca-intent']!=='inspect')throw Error('intent');res.setHeader('content-type','application/json');if(mode==='off'||mode==='outage'){res.statusCode=mode==='off'?503:502;return res.end('{"error":"LOCAL_TEST_DENIAL"}');}return res.end(JSON.stringify(['stale','unsupported'].includes(mode)?inspection(o.mint,mode):ownerShape(o.mint,mode)));}
 if(u.pathname==='/lens'){res.setHeader('content-type','text/html');return res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LOCAL ORACLE QA</title><style>${readFileSync('app/globals.css','utf8')}${readFileSync('app/lens/ca-view.module.css','utf8')}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>`);}
 res.statusCode=404;res.end('LOCAL_NOT_FOUND');
 }catch{res.statusCode=400;res.end('LOCAL_BAD_REQUEST');}});
await new Promise((ok,no)=>{server.once('error',no);server.listen(3861,'127.0.0.1',ok);});process.stdout.write('LOCAL ORACLE QA ready\n');
function close(){server.closeAllConnections();server.close(()=>process.exit(0));}process.on('SIGTERM',close);process.on('SIGINT',close);
