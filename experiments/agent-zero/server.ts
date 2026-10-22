import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {Agent0} from './service';
import {keys,object,text,type Mode} from './core';
const TYPES:Record<string,string>={'/':'text/html; charset=utf-8','/app.js':'text/javascript; charset=utf-8','/style.css':'text/css; charset=utf-8','/outlier.svg':'image/svg+xml'};
export function localServer(app:Agent0,port:number,assets:string){
 const origin=`http://127.0.0.1:${port}`;
 return createServer(async(req:IncomingMessage,res:ServerResponse)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const send=(status:number,data:unknown)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
  if(req.headers.host!==`127.0.0.1:${port}`||req.headers.origin&&req.headers.origin!==origin){send(403,{error:'local_origin_required'});return;}
  if(req.headers['sec-fetch-site']==='cross-site'){send(403,{error:'cross_site_denied'});return;}
  try{
   const url=new URL(req.url??'/',origin),mode=url.searchParams.get('mode')??'recorded';if(!['recorded','synthetic'].includes(mode))throw Error('invalid_workspace');
   if(req.method==='GET'&&url.pathname==='/state'){send(200,app.state(mode as Mode,new Date().toISOString()));return;}
   if(req.method==='GET'&&url.pathname==='/export'){res.setHeader('Content-Type','application/x-ndjson');res.setHeader('Content-Disposition',`attachment; filename="agent0-${mode}-PRIVATE.jsonl"`);res.end(app.export(mode as Mode));return;}
   if(req.method==='POST'&&url.pathname==='/record'){
    if(req.headers.origin!==origin||req.headers['x-agent0-local']!=='research-only'||req.headers['content-type']!=='application/json'){send(403,{error:'local_explicit_record_only'});return;}
    let size=0;const parts:Buffer[]=[];
    const body=await new Promise<Buffer|null>((resolve,reject)=>{let over=false;req.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>32768){parts.length=0;if(!over){over=true;resolve(null);}}else if(!over)parts.push(chunk);});req.on('end',()=>{if(!over)resolve(Buffer.concat(parts));});req.on('error',reject);req.on('aborted',()=>reject(Error('request_aborted')));});
    if(body===null){send(413,{error:'record_too_large'});return;}
    const p=object(JSON.parse(body.toString('utf8')));keys(p,['requestId','kind','payload']);const result=app.command(mode as Mode,text(p.requestId,100),text(p.kind,50),p.payload,new Date().toISOString());send(200,result);return;
   }
   if(req.method==='GET'&&url.pathname in TYPES){res.setHeader('Content-Type',TYPES[url.pathname]);res.end(readFileSync(join(assets,url.pathname==='/'?'index.html':url.pathname.slice(1))));return;}
   send(404,{error:'no_such_local_research_resource'});
  }catch(e){const message=e instanceof Error&&/^[a-z0-9_]+$/.test(e.message)?e.message:'ledger_or_source_unavailable';send(409,{error:message});}
 });
}
if(require.main===module){
 const args=process.argv.slice(2),dirIndex=args.indexOf('--ledger-dir'),portIndex=args.indexOf('--port'),privateDir=dirIndex>=0?args[dirIndex+1]:undefined,port=portIndex>=0?Number(args[portIndex+1]):4190;
 if(!privateDir||!Number.isInteger(port)||port<1024||port>65535)throw Error('Use --ledger-dir ABSOLUTE_OUTSIDE_CHECKOUT [--port 4190]');
 const root=resolve(process.cwd()),app=new Agent0(root,privateDir),server=localServer(app,port,join(root,'experiments/agent-zero/web'));server.headersTimeout=10000;server.requestTimeout=10000;server.maxHeadersCount=30;
 server.listen(port,'127.0.0.1',()=>console.log(`SCOUT / AGENT 0 — PRIVATE LOCAL ONLY — http://127.0.0.1:${port}`));
}
