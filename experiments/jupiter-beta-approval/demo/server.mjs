// LOOPBACK-ONLY synthetic harness. No real WebAuthn enrollment, managed signer or source.
import http from 'node:http';import fs from 'node:fs';import {fileURLToPath} from 'node:url';import path from 'node:path';
import {simulation} from '../test-only/harness.mjs';
import {canonical,hash,USDC,SOL,MODE} from '../protocol.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
export async function startDemo({port=3899}={}){
 if(!Number.isInteger(port)||port<0||port>65535)throw Error('invalid_local_port');
 const h=simulation({now:Date.now()});let current=null,pending=null,envelope=null,owner=false,validator=false,validating=false,revoked=false,last='Create a TEST proposal.',lastOperation=null,count=0,offset=0;
 const tick=()=>{h.setNow(Date.now()+offset);return h.clock();};
 const view=()=>({mode:MODE,activate:false,sourceCalls:false,liveSigningConnected:false,acquisitionConnected:false,clockNow:tick(),
  proposal:current?h.describe(current):null,canonicalRecord:current?canonical(current):null,owner,validator,revoked,
  verification:envelope?h.verifier.verify(envelope).status:'denied',ledger:h.ledger.inspect(),testProviderOperations:{...h.calls},last});
 let origin;
 const server=http.createServer(async(req,res)=>{
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"};
  const reply=(status,value)=>{if(!res.destroyed&&!res.headersSent){res.writeHead(status,{...headers,'Content-Type':'application/json'});res.end(JSON.stringify(value));}};
  const deny=()=>reply(400,{status:'denied',mode:MODE,activate:false,sourceCalls:false});
  try{
   tick();
   if(req.headers.host!==new URL(origin).host||req.headers.authorization||req.headers['x-api-key'])return deny();
   const url=new URL(req.url,origin);if(url.search||url.hash)return deny();
   const staticFiles={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8']};
   if(req.method==='GET'&&Object.hasOwn(staticFiles,url.pathname)){const[f,type]=staticFiles[url.pathname];res.writeHead(200,{...headers,'Content-Type':type});return res.end(fs.readFileSync(path.join(root,f)));}
   if(req.method==='GET'&&url.pathname==='/api/lab/state')return reply(200,view());
   if(req.method!=='POST')return reply(405,{status:'denied',mode:MODE,activate:false,sourceCalls:false});
   if(req.headers.origin!==origin||req.headers['x-prototype-intent']!=='simulate'||req.headers['content-type']!=='application/json'||req.headers['sec-fetch-site']==='cross-site')return deny();
   let length=0,chunks=0;const parts=[],deadline=setTimeout(()=>req.destroy(),1000);
   try{for await(const b of req){length+=b.length;if(length>16384||++chunks>256){req.destroy();return;}parts.push(b);}}finally{clearTimeout(deadline);}
   const body=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(parts)));
   if(!body||Array.isArray(body)||typeof body!=='object')return deny();
   const exact=keys=>Object.keys(body).sort().join(',')===[...keys].sort().join(',');
   switch(url.pathname){
    case '/api/lab/proposal':{
     if(!exact(['scope'])||!['single','pair'].includes(body.scope)||validating||h.ledger.inspect().stopped||revoked)return deny();
     current=h.makeRecord();if(body.scope==='pair')current.scope={...current.scope,mints:[USDC,SOL].sort(),maxUses:2};
     pending=null;envelope=null;owner=false;validator=false;lastOperation=null;last='TEST proposal created. Review its exact scope and hash.';break;
    }
    case '/api/lab/owner':{
     if(!exact(['recordHash'])||!current||validating||body.recordHash!==hash(canonical(current))||owner)return deny();
     pending=h.prepare(current);owner=true;last='TEST owner assertion created. No real passkey or owner authentication occurred.';break;
    }
    case '/api/lab/validator':{
     if(!exact(['recordHash'])||!current||!pending||validator||validating||body.recordHash!==hash(canonical(current)))return deny();
     validating=true;try{const a=await h.createValidator({clock:tick}).approve(pending);envelope=a.envelope??null;validator=a.status==='approved_simulation_only';last=validator?'Both TEST approvers verified. Simulated grant only; acquisition remains disconnected.':'DENIED: payload, approval, replay, expiry or local policy did not match.';}finally{validating=false;}break;
    }
    case '/api/lab/tamper':{
     if(!exact([])||!current||!pending||validator||validating)return deny();
     current={...current,scope:{...current.scope,mints:[USDC,SOL].sort(),maxUses:2}};pending={...pending,request:h.rawFor(current)};last='TEST payload changed after owner approval. Validator must deny.';break;
    }
    case '/api/lab/reserve':{
     if(!exact(['mint'])||!current||!envelope)return deny();lastOperation='test_demo_use_'+(++count);const a=h.verifier.reserve(envelope,body.mint,lastOperation);last=a.status==='reserved_simulation_only'?'Local TEST budget debited. No provider request was sent.':'DENIED: local budget, mint, expiry, revocation or STOP.';break;
    }
    case '/api/lab/replay':{
     if(!exact([])||!current||!envelope||!lastOperation)return deny();const a=h.verifier.reserve(envelope,current.scope.mints[0],lastOperation);last=a.status==='denied'?'DENIED: replay rejected; no new debit or source call.':'UNEXPECTED TEST RESULT';break;
    }
    case '/api/lab/expire':if(!exact([])||!current)return deny();offset=Math.max(offset,current.expiresAt-Date.now());tick();last='TEST clock advanced to expiry. Current grant withdrawn.';break;
    case '/api/lab/revoke':if(!exact([]))return deny();h.ledger.admin.revokeKey(h.context.beta.keyId,1);revoked=true;last='TEST key revoked. Existing signatures do not bypass the local revocation check.';break;
    case '/api/lab/stop':if(!exact([]))return deny();h.verifier.stop();last='Permanent local TEST STOP. No unstop, refund or reset operation.';break;
    default:return deny();
   }
   return reply(200,view());
  }catch{return deny();}
 });
 server.requestTimeout=1000;server.headersTimeout=1000;server.maxHeadersCount=32;
 await new Promise((ok,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',ok);});origin='http://127.0.0.1:'+server.address().port;
 return Object.freeze({origin,close:()=>new Promise(ok=>{server.close(ok);server.closeAllConnections();})});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=process.argv[2]===undefined?3899:Number(process.argv[2]);
 const demo=await startDemo({port});console.log('SYNTHETIC ONLY: '+demo.origin+' · loopback · no signer/source connected');
}
