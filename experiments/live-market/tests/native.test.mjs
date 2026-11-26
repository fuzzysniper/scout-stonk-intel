import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import https from 'node:https';
import {createRequire} from 'node:module';
import path from 'node:path';
import {nativePorts} from '../native.mjs';
const require=createRequire(import.meta.url),{SCOPE}=require(path.join(process.env.LIVE_MARKET_BUILD,'policy.js'));
const {fixture}=require(path.join(process.env.LIVE_MARKET_BUILD,'../launch-intel/fixtures.js'));
const ws=require('../node_modules/ws'),sig=fixture().signature;

test('native options allow one bounded WS and six read-only HTTP attempts; no actual external sockets',async()=>{
 const Original=ws.WebSocket,request=https.request;const dials=[],requests=[];let payload='{"jsonrpc":"2.0","id":10,"result":null}',status=200;
 class OfflineSocket extends EventEmitter{constructor(url,options){super();dials.push({url,options});}terminate(){}send(){}}
 ws.WebSocket=OfflineSocket;
 https.request=(url,options,callback)=>{
  requests.push({url,options});const req=new EventEmitter();req.destroy=()=>req.emit('error',Error('OFFLINE'));
  req.end=()=>queueMicrotask(()=>{const res=new EventEmitter();res.statusCode=status;res.destroy=()=>{};callback(res);res.emit('data',Buffer.from(payload));res.emit('end');req.emit('close');});return req;
 };
 try{
  const p=nativePorts(SCOPE),abort=new AbortController(),h={open(){},data(){},error(){},close(){}};
  const socket=p.open(h,abort.signal);assert.throws(()=>p.open(h,abort.signal),/ONE_CONNECTION/);
  assert.equal(dials.length,1);assert.equal(dials[0].url,SCOPE.websocket);assert.equal(dials[0].options.maxPayload,SCOPE.maxFrameBytes);assert.equal(dials[0].options.autoPong,false);
  const body=JSON.stringify({jsonrpc:'2.0',id:10,method:'getTransaction',params:[sig,{encoding:'json',commitment:'finalized',maxSupportedTransactionVersion:0}]});
  await assert.rejects(p.read(JSON.stringify({jsonrpc:'2.0',id:10,method:'sendTransaction',params:[sig]}),abort.signal));assert.equal(requests.length,0);
  for(let i=0;i<6;i++)assert.equal(await p.read(body,abort.signal),payload);await assert.rejects(p.read(body,abort.signal));assert.equal(requests.length,6);assert.ok(requests.every(r=>r.url===SCOPE.rpc&&r.options.rejectUnauthorized===true));
  const cap=nativePorts(SCOPE);payload='x'.repeat(SCOPE.maxRpcResponseBytes+1);await assert.rejects(cap.read(body,abort.signal),/BODY_CAP/);
  const redirected=nativePorts(SCOPE);payload='';status=302;await assert.rejects(redirected.read(body,abort.signal),/NON_200/);
  assert.throws(()=>nativePorts({...SCOPE,rpc:'https://evil.example/'}),/PINNED_SCOPE/);abort.abort();socket.close();
 }finally{ws.WebSocket=Original;https.request=request;}
});
