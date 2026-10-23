import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import https from 'node:https';
import {createRequire} from 'node:module';
import {nativeSource} from '../native.mjs';
import {policy,fixture} from './fixtures.mjs';
const require=createRequire(import.meta.url),ws=require('../node_modules/ws'),{SCOPE}=policy;

test('native Standard WSS is lazy, one-at-a-time, pinned, capped and closes before reuse; no actual socket',async()=>{
  const Original=ws.WebSocket,dials=[];let reads=0;
  class OfflineSocket extends EventEmitter{
    static OPEN=1;
    constructor(url,options){super();this.readyState=1;this.options=options;this.url=url;this.sent=[];dials.push(this);}
    send(raw){this.sent.push(JSON.parse(raw));}ping(){}pong(){}
    terminate(){if(!this.ended){this.ended=true;queueMicrotask(()=>this.emit('close'));}}
  }
  ws.WebSocket=OfflineSocket;
  try{
    const source=nativeSource(SCOPE,()=>{reads++;return 'SYNTHETIC_DATA_KEY_ONLY';});assert.equal(reads,0);
    const abort=new AbortController(),h={open(){},frame(){},pong(){},close(){},fatal(){}};
    const first=source.open(h,abort.signal,()=>true);assert.equal(reads,1);assert.equal(dials.length,1);
    assert.equal(new URL(dials[0].url).hostname,'mainnet.helius-rpc.com');assert.equal(new URL(dials[0].url).protocol,'wss:');
    assert.equal(dials[0].options.maxPayload,65536);assert.equal(dials[0].options.rejectUnauthorized,true);assert.equal(dials[0].options.followRedirects,false);assert.equal(dials[0].options.perMessageDeflate,false);
    dials[0].emit('open');assert.equal(dials[0].sent[0].method,'logsSubscribe');assert.deepEqual(dials[0].sent[0].params,[{mentions:[SCOPE.program]},{commitment:'finalized'}]);
    assert.throws(()=>source.open(h,abort.signal,()=>true));first.close();await first.closed;
    for(let i=0;i<2;i++){const c=source.open(h,abort.signal,()=>true);c.close();await c.closed;}
    assert.throws(()=>source.open(h,abort.signal,()=>true));assert.equal(dials.length,3);
    assert.throws(()=>nativeSource({...SCOPE,host:'evil.example'},()=>''));
  }finally{ws.WebSocket=Original;}
});
test('key lookup cannot advance past lease expiry into a dial',()=>{
  const Original=ws.WebSocket;let called=0,allowed=true;
  ws.WebSocket=class extends EventEmitter{constructor(){super();called++;}};
  try{const s=nativeSource(SCOPE,()=>{allowed=false;return 'SYNTHETIC_DATA_KEY_ONLY';});assert.throws(()=>s.open({},new AbortController().signal,()=>allowed));assert.equal(called,0);}
  finally{ws.WebSocket=Original;}
});
test('keepalive uses bounded control frames; only matching pong updates actual provider clock',async t=>{
  const Original=ws.WebSocket,sockets=[],pongs=[],fatals=[];
  class OfflineSocket extends EventEmitter{static OPEN=1;constructor(){super();this.readyState=1;sockets.push(this);}send(){}ping(b){this.lastPing=Buffer.from(b);}pong(b){this.lastPong=Buffer.from(b);}terminate(){queueMicrotask(()=>this.emit('close'));}}
  ws.WebSocket=OfflineSocket;t.mock.timers.enable({apis:['setInterval','setTimeout']});
  try{
    const s=nativeSource(SCOPE,()=> 'SYNTHETIC_DATA_KEY_ONLY'),c=s.open({open(){},frame(){},close(){},pong(){pongs.push(true);},fatal:r=>fatals.push(r)},new AbortController().signal,()=>true),sock=sockets[0];
    sock.emit('open');t.mock.timers.tick(30000);assert.equal(sock.lastPing.length,8);
    sock.emit('pong',Buffer.alloc(8,9));assert.equal(pongs.length,0);
    sock.emit('pong',sock.lastPing);assert.equal(pongs.length,1);
    sock.emit('ping',Buffer.from('test'));assert.equal(sock.lastPong.toString(),'test');
    t.mock.timers.tick(30000);t.mock.timers.tick(10000);await c.closed;assert.equal(fatals.length,0); // pong timeout is a bounded reconnectable close
  }finally{t.mock.timers.reset();ws.WebSocket=Original;}
});
test('HTTP is serial and read-only; no redirect/compression/oversize acceptance or auth error leak',async()=>{
  const original=https.request,requests=[];let payload='{"jsonrpc":"2.0","id":10,"result":null}',status=200,encoding,hold=false;
  https.request=(url,options,callback)=>{
    requests.push({url,options});const r=new EventEmitter();r.destroy=()=>r.emit('error',Error('SYNTHETIC_API_URL_MUST_NOT_ESCAPE'));
    r.end=()=>{if(hold)return;queueMicrotask(()=>{const res=new EventEmitter();res.headers={'content-encoding':encoding};res.statusCode=status;res.destroy=()=>{};callback(res);res.emit('data',Buffer.from(payload));res.emit('end');r.emit('close');});};return r;
  };
  try{
    const s=nativeSource(SCOPE,()=> 'SYNTHETIC_DATA_KEY_ONLY'),abort=new AbortController(),sig=fixture().signature,body=policy.rpcRequest(sig,'transaction');
    await assert.rejects(s.read(JSON.stringify({jsonrpc:'2.0',id:10,method:'sendTransaction',params:[sig]}),abort.signal,()=>true));assert.equal(requests.length,0);
    await assert.rejects(s.read(body,abort.signal,()=>false));assert.equal(requests.length,0);
    for(let i=0;i<40;i++)assert.equal(await s.read(body,abort.signal,()=>true),payload);
    await assert.rejects(s.read(body,abort.signal,()=>true));assert.equal(requests.length,40);
    assert.ok(requests.every(x=>x.options.rejectUnauthorized===true&&new URL(x.url).hostname==='mainnet.helius-rpc.com'));
    status=302;await assert.rejects(nativeSource(SCOPE,()=> 'SYNTHETIC_DATA_KEY_ONLY').read(body,abort.signal,()=>true),/RPC_STATUS/);
    status=200;encoding='gzip';await assert.rejects(nativeSource(SCOPE,()=> 'SYNTHETIC_DATA_KEY_ONLY').read(body,abort.signal,()=>true),/RPC_STATUS/);
    encoding=undefined;payload='x'.repeat(SCOPE.maxRpcResponseBytes+1);await assert.rejects(nativeSource(SCOPE,()=> 'SYNTHETIC_DATA_KEY_ONLY').read(body,abort.signal,()=>true),/RPC_BODY_CAP/);
    hold=true;const serial=nativeSource(SCOPE,()=> 'SYNTHETIC_DATA_KEY_ONLY'),pending=serial.read(body,abort.signal,()=>true);await assert.rejects(serial.read(body,abort.signal,()=>true));abort.abort();
    // Our mocked request does not implement AbortSignal; its fixed 5s timeout still bounds it.
    await assert.rejects(pending,/RPC_TIMEOUT|RPC_TRANSPORT/);
  }finally{https.request=original;}
});
