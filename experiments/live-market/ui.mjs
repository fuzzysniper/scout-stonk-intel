import http from 'node:http';
import fs from 'node:fs';
export function privateView(snapshot){
 let port=0;
 const assets={'/':['text/html; charset=utf-8','view.html'],'/view.js':['text/javascript; charset=utf-8','view.js'],'/style.css':['text/css; charset=utf-8','style.css']};
 const server=http.createServer((req,res)=>{
  const host='127.0.0.1:'+port,origin='http://'+host;
  const headers={'cache-control':'no-store','content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",'x-content-type-options':'nosniff','referrer-policy':'no-referrer','cross-origin-resource-policy':'same-origin','x-frame-options':'DENY'};
  if(req.method!=='GET'||req.headers.host!==host||(req.headers.origin&&req.headers.origin!==origin)||(req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site']))){res.writeHead(403,headers);res.end();return;}
  try{
   if(req.url==='/state'){res.writeHead(200,{...headers,'content-type':'application/json'});res.end(JSON.stringify(snapshot()));return;}
   const a=assets[req.url];if(!a){res.writeHead(404,headers);res.end();return;}
   const bytes=fs.readFileSync(new URL(a[1],import.meta.url));res.writeHead(200,{...headers,'content-type':a[0]});res.end(bytes);
  }catch{res.writeHead(503,headers);res.end();}
 });
 return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{port=server.address().port;resolve({url:'http://127.0.0.1:'+port,close:()=>server.close()});});});
}
