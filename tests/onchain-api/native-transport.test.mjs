// SYNTHETIC OFFLINE ONLY: temporary loopback TLS server/certificate, never Helius or authentic mint facts.
import assert from "node:assert/strict";
import { test, before, after, beforeEach } from "node:test";
import { createRequire } from "node:module";
import { createServer, request as httpsRequest } from "node:https";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { root, MINT, HELIUS_HOST, SYNTHETIC_KEY, envelope, prepareIsolatedHeliusTarget } from "./fixtures.mjs";
const require=createRequire(import.meta.url);
const {isolatedHttpsTransport}=require(`${root}/lib/onchain-mint/server/native-transport.js`);
const {heliusRead}=require(`${root}/lib/onchain-mint/server/rpc.js`);
const dir=mkdtempSync(join(tmpdir(),"scout-tls-"));
let server,cert,port,scenario="ok",hits=0,seen;const sockets=new Set();
before(async()=>{
  const r=spawnSync("openssl",["req","-x509","-newkey","rsa:2048","-nodes","-keyout",join(dir,"synthetic.key"),"-out",join(dir,"synthetic.crt"),"-days","1","-subj","/CN=localhost","-addext","subjectAltName=DNS:localhost"],{encoding:"utf8",timeout:15000});
  assert.equal(r.status,0,"local synthetic certificate generation failed");cert=readFileSync(join(dir,"synthetic.crt"));
  server=createServer({key:readFileSync(join(dir,"synthetic.key")),cert},(req,res)=>{
    hits++;let body="";req.on("data",b=>body+=b);req.on("end",()=>{
      seen={path:req.url,method:req.method,headers:req.headers,body:JSON.parse(body)};
      if(scenario==="hang")return;
      if(scenario==="redirect"){res.writeHead(302,{location:"https://evil.invalid/SYNTHETIC_SECRET"});res.end();return;}
      if(scenario==="503"){res.writeHead(503,{"content-type":"application/json"});res.end("SYNTHETIC_SECRET "+SYNTHETIC_KEY);return;}
      if(scenario==="largeHeaders"){res.writeHead(200,{"x-overflow":"x".repeat(17000)});res.end();return;}
      if(scenario==="compressed"){res.writeHead(200,{"content-type":"application/json","content-encoding":"gzip"});res.end("SYNTHETIC_COMPRESSED");return;}
      const text=scenario==="largeBody"?"x".repeat(65537):JSON.stringify(envelope());
      res.writeHead(200,{"content-type":"application/json","content-length":Buffer.byteLength(text)});res.end(text);
    });
  });
  server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket));});server.on("tlsClientError",()=>{});
  await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});port=server.address().port;
});
beforeEach(()=>{scenario="ok";seen=null;hits=0;});
after(async()=>{for(const s of sockets)s.destroy();if(server)await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});});
function localTransport(tls={}){
  return isolatedHttpsTransport((options,cb)=>{
    assert.equal(options.hostname,HELIUS_HOST);assert.equal(options.servername,HELIUS_HOST);assert.equal(options.rejectUnauthorized,true);
    assert.equal(options.agent,false);assert.equal(options.maxHeaderSize,16384);assert.equal(options.minVersion,"TLSv1.2");
    // Test-only wire routes the FIXED production destination to a local TLS fixture.
    return httpsRequest({...options,hostname:"127.0.0.1",port,servername:"localhost",ca:cert,...tls},cb);
  });
}
const url=`https://${HELIUS_HOST}/?api-key=${SYNTHETIC_KEY}`;
const init=()=>({method:"POST",redirect:"error",credentials:"omit",cache:"no-store",signal:new AbortController().signal,
  body:JSON.stringify({jsonrpc:"2.0",id:1,method:"getAccountInfo",params:[MINT,{encoding:"jsonParsed",commitment:"finalized"}]})});
const read=(transport=localTransport(),extra={})=>heliusRead({mint:MINT,requestId:1,target:prepareIsolatedHeliusTarget(SYNTHETIC_KEY),transport,
  clock:{now:()=>Date.now(),monotonic:()=>performance.now()},signal:new AbortController().signal,acquisition:"production_rpc",...extra});
test("SYNTHETIC real local TLS: native fixed read bypasses poisoned global Fetch and preserves digest/provenance",async()=>{
  const original=globalThis.fetch;globalThis.fetch=()=>{throw Error("global Fetch must not receive credential-bearing URL");};
  try{const r=await read();assert.equal(r.result.source.acquisition,"production_rpc");assert.equal(r.result.source.endpointHost,HELIUS_HOST);assert.match(r.result.source.responseSha256,/^[a-f0-9]{64}$/);assert.equal(hits,1);
    assert.equal(seen.path,"/?api-key="+SYNTHETIC_KEY);assert.equal(seen.method,"POST");assert.equal(seen.headers["accept-encoding"],"identity");assert.equal(seen.body.params[0],MINT);
    assert.ok(!JSON.stringify(r).includes(SYNTHETIC_KEY));
  }finally{globalThis.fetch=original;}
});
for(const [label,tls] of [["untrusted certificate",{ca:undefined}],["wrong TLS hostname",{servername:HELIUS_HOST}]])test(`real TLS rejects ${label} without leaking connection errors/keys`,async()=>{
  await assert.rejects(read(localTransport(tls)),e=>e.reason==="network_unavailable"&&!JSON.stringify(e).includes(SYNTHETIC_KEY));assert.equal(hits,0);
});
for(const [name,reason] of [["redirect","upstream_unavailable"],["503","upstream_unavailable"],["largeBody","response_too_large"],["largeHeaders","network_unavailable"],["compressed","network_unavailable"]])test(`native transport ${name}: bounded failure, no follow/retry or source fallback`,async()=>{
  scenario=name;await assert.rejects(read(),e=>e.reason===reason);assert.equal(hits,1);
});
test("native socket/stream is destroyed on caller deadline with no retry",async()=>{
  scenario="hang";const started=performance.now();await assert.rejects(read(localTransport(),{deadlineMs:60}),e=>e.reason==="timeout");assert.ok(performance.now()-started<500);assert.ok(hits<=1);
});
test("native boundary rejects arbitrary hosts/protocol/method/batch before any wire operation",async()=>{
  let calls=0;const t=isolatedHttpsTransport(()=>{calls++;throw Error("must not connect");});
  for(const target of [url.replace(HELIUS_HOST,"evil.invalid"),url.replace("https:","http:"),url+"&x=1","not a URL "+SYNTHETIC_KEY])await assert.rejects(t(target,init()),e=>!JSON.stringify(e).includes(SYNTHETIC_KEY));
  for(const value of [{...init(),method:"GET"},{...init(),body:JSON.stringify([{method:"getAccountInfo"}])},{...init(),body:init().body.replace("getAccountInfo","getProgramAccounts")},{...init(),body:init().body.replace(MINT,"SI")},{...init(),body:init().body.replace('"method":','"method":"getProgramAccounts","method":')},{...init(),body:"[invalid JSON"}])await assert.rejects(t(url,value));
  assert.equal(calls,0);
});
