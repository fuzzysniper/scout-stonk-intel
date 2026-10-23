import https from 'node:https';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);

// No socket or key read at import/construction. Only the controller holds this capability.
export function nativeSource(scope,readDataKey){
  const pinned=JSON.parse(fs.readFileSync(new URL('./scope.json',import.meta.url),'utf8')).scope;
  if(JSON.stringify(scope)!==JSON.stringify(pinned))throw Error('PINNED_SCOPE_REQUIRED');
  scope=pinned; // Do not retain a mutable caller-owned limits object.
  if(require('ws/package.json').version!=='8.22.0'||!require.resolve('ws').startsWith(fileURLToPath(new URL('./node_modules/ws/',import.meta.url))))throw Error('PINNED_WS_REQUIRED');
  const {WebSocket}=require('ws'),agent=new https.Agent({keepAlive:true,maxSockets:1,maxTotalSockets:1});
  let active=null,opens=0,reads=0,reading=false;
  const endpoint=protocol=>{
    const key=readDataKey();if(typeof key!=='string'||!(/^[A-Za-z0-9_-]{16,256}$/).test(key))throw Error('DATA_KEY_FORMAT');
    return `${protocol}://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`;
  };
  return {
    open(h,signal,allowed){
      if(active||opens>=scope.maxConnectionAttempts||signal.aborted||!allowed())throw Error('CONNECTION_NOT_ADMITTED');opens++;
      const url=endpoint('wss');if(!allowed()||signal.aborted)throw Error('SOURCE_LEASE_EXPIRED');
      const ws=new WebSocket(url,{maxPayload:scope.maxFrameBytes,maxFragments:32,maxBufferedChunks:64,
        allowSynchronousEvents:false,perMessageDeflate:false,followRedirects:false,handshakeTimeout:scope.rpcTimeoutMs,rejectUnauthorized:true,autoPong:false});
      active=ws;let resolveClosed,reason='SOURCE_DISCONNECTED',frames=0,bytes=0,controls=0,controlBytes=0,nonce=0n,pending=null,pingTimer,pongTimer,fatalSent=false;
      const closed=new Promise(resolve=>{resolveClosed=resolve;});
      const close=()=>{ws.terminate();agent.destroy();};
      const fatal=r=>{if(fatalSent)return;fatalSent=true;reason=r;try{h.fatal(r);}finally{close();}};
      const control=n=>{if(++controls>scope.maxControlFrames||(controlBytes+=n)>scope.maxControlBytes){fatal('SOURCE_CONTROL_CAP');return false;}return true;};
      const abort=()=>{reason='SOURCE_ABORTED';close();};signal.addEventListener('abort',abort,{once:true});
      ws.on('open',()=>{
        if(signal.aborted||!allowed()){fatal('SOURCE_LEASE_EXPIRED');return;}
        try{ws.send(JSON.stringify({jsonrpc:'2.0',id:1,method:'logsSubscribe',params:[{mentions:[scope.program]},{commitment:'finalized'}]}));h.open();}
        catch{fatal('SOURCE_SUBSCRIBE_FAILURE');return;}
        pingTimer=setInterval(()=>{
          if(!allowed()||signal.aborted){fatal('SOURCE_LEASE_EXPIRED');return;}
          if(ws.readyState!==WebSocket.OPEN)return;
          if(pending||!control(8)){fatal('SOURCE_PONG_TIMEOUT');return;}
          pending=Buffer.alloc(8);pending.writeBigUInt64BE(++nonce);
          try{ws.ping(pending);}catch{fatal('SOURCE_PING_FAILURE');return;}
          pongTimer=setTimeout(()=>{reason='SOURCE_PONG_TIMEOUT';close();},scope.pongTimeoutMs);
        },scope.pingMs);
      });
      ws.on('message',(data,binary)=>{
        if(!allowed()||signal.aborted){fatal('SOURCE_LEASE_EXPIRED');return;}
        if(binary||data.length>scope.maxFrameBytes||++frames>scope.maxFramesPerConnection||(bytes+=data.length)>scope.maxBytesPerConnection){fatal('SOURCE_RECEIVE_CAP');return;}
        try{h.frame(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(data));}catch{fatal('SOURCE_INVALID_FRAME');}
      });
      ws.on('ping',data=>{
        if(!allowed()||signal.aborted){fatal('SOURCE_LEASE_EXPIRED');return;}
        if(!control(data.length)||!control(data.length))return;
        try{ws.pong(data);}catch{fatal('SOURCE_PONG_FAILURE');}
      });
      ws.on('pong',data=>{
        if(!allowed()||signal.aborted){fatal('SOURCE_LEASE_EXPIRED');return;}
        if(!control(data.length))return;
        if(pending&&Buffer.from(data).equals(pending)){pending=null;clearTimeout(pongTimer);h.pong();}
      });
      ws.on('unexpected-response',(_req,res)=>{res.destroy();fatal('SOURCE_AUTH_OR_QUOTA_DENIED');});
      ws.on('error',error=>{
        if(String(error?.code??'').startsWith('WS_ERR_')){fatal('SOURCE_PROTOCOL_INVALID');return;}
        reason='SOURCE_TRANSPORT_ERROR';close(); // Only confirmed close permits bounded reconnection.
      });
      ws.on('close',()=>{
        clearInterval(pingTimer);clearTimeout(pongTimer);signal.removeEventListener('abort',abort);active=null;
        try{h.close(reason);}finally{resolveClosed();}
      });
      return {closed,close};
    },
    read(body,signal,allowed){return new Promise((resolve,reject)=>{
      if(signal.aborted||!allowed()||reading||reads>=scope.maxRpcAttempts||typeof body!=='string'||body.length>512)throw Error('RPC_NOT_ADMITTED');
      const p=JSON.parse(body),sig=p.method==='getTransaction'?p.params?.[0]:p.params?.[0]?.[0];
      if(typeof sig!=='string'||!(/^[1-9A-HJ-NP-Za-km-z]{64,90}$/).test(sig))throw Error('RPC_SIGNATURE');
      const expected=p.method==='getTransaction'?{jsonrpc:'2.0',id:10,method:'getTransaction',params:[sig,{encoding:'json',commitment:'finalized',maxSupportedTransactionVersion:0}]}:{jsonrpc:'2.0',id:11,method:'getSignatureStatuses',params:[[sig],{searchTransactionHistory:true}]};
      if(body!==JSON.stringify(expected))throw Error('RPC_METHOD_DENIED');
      reads++;reading=true;
      let timer,settled=false;
      const finish=(error,value)=>{if(settled)return;settled=true;reading=false;clearTimeout(timer);if(error)reject(Error(error));else resolve(value);};
      let req;
      try{const url=endpoint('https');if(!allowed()||signal.aborted)throw Error('RPC_NOT_ADMITTED');
        req=https.request(url,{method:'POST',agent,signal,rejectUnauthorized:true,
        headers:{'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{
          if(res.statusCode!==200||(res.headers?.['content-encoding']&&res.headers['content-encoding']!=='identity')||Number(res.headers?.['content-length']??0)>scope.maxRpcResponseBytes){res.destroy();finish('RPC_STATUS_ENCODING_OR_CAP');return;}
          const chunks=[];let size=0;
          res.on('data',b=>{if((size+=b.length)>scope.maxRpcResponseBytes){res.destroy();finish('RPC_BODY_CAP');}else chunks.push(b);});
          res.on('error',()=>finish('RPC_RESPONSE_FAILURE'));
          res.on('end',()=>{try{finish(null,new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks)));}catch{finish('RPC_INVALID_UTF8');}});
        });}
      catch{finish('RPC_CONSTRUCTION_FAILURE');return;}
      timer=setTimeout(()=>{req.destroy();finish('RPC_TIMEOUT');},scope.rpcTimeoutMs);
      req.on('error',()=>finish('RPC_TRANSPORT_FAILURE'));req.on('close',()=>{if(!settled)finish('RPC_INCOMPLETE_RESPONSE');});req.end(body);
    });},
  };
}
