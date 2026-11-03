// Execute the actual compiled PRIVATE wire in an in-memory test sandbox. Never patch source files.
// Simulated HTTPS/TLS events only, not certificate-chain/handshake or hosted compatibility proof.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';import {createRequire} from 'node:module';import {EventEmitter} from 'node:events';
const file=path.join(process.env.NATIVE_BUILD,'lib/native-pilot/index.js'),original=createRequire(file),KEY='SYNTHETIC_OFFLINE_KEY_123456';
function fixture(kind){let observed,dispatches=0;const fake={request(options,callback){
 observed=options;dispatches++;if(kind==='constructor-error')throw Error('SYNTHETIC ERROR '+KEY);const req=new EventEmitter();req.destroy=()=>{req.destroyed=true;};req.end=body=>{observed.body=body;if(kind==='timeout')return;queueMicrotask(()=>{
 const socket=new EventEmitter();Object.assign(socket,{encrypted:true,authorized:kind!=='tls-unauthorized',servername:kind==='sni-wrong'?'wrong.invalid':'mainnet.helius-rpc.com',getProtocol:()=>kind==='tls-old'?'TLSv1':'TLSv1.3',getPeerCertificate:()=>({subjectaltname:'DNS:'+(kind==='cert-wrong'?'wrong.invalid':'mainnet.helius-rpc.com')})});
 req.emit('socket',socket);socket.emit('secureConnect');if(req.destroyed)return;
 const res=new EventEmitter();Object.assign(res,{statusCode:kind==='redirect'?302:kind==='429'?429:kind==='503'?503:200,headers:{'content-type':kind==='html'?'text/html':'application/json',...(kind==='gzip'?{'content-encoding':'gzip'}:{})},complete:true});res.destroy=()=>{};callback(res);if(req.destroyed)return;
 if(kind==='aborted')res.emit('aborted');else{res.emit('data',kind==='oversize'?Buffer.alloc(131073):Buffer.from('{"jsonrpc":"2.0","id":260001,"result":null}'));res.emit('end');}
 });};return req;}};
 const context={exports:{},require:s=>s==='node:https'?fake:original(s),Buffer,process:{env:{}},setTimeout,clearTimeout,Date,queueMicrotask};
 vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nexports.__SYNTHETIC_PRIVATE_WIRE=wire;',context,{filename:file});
 return {wire:context.exports.__SYNTHETIC_PRIVATE_WIRE,get options(){return observed;},get dispatches(){return dispatches;}};
}
test('actual private native request fixes HTTPS host/SNI/method/path/limits and keeps secret out of receipt',async()=>{
 const f=fixture('ok'),body='{"jsonrpc":"2.0","id":260001,"method":"getTokenLargestAccounts","params":[]}';const c=await f.wire(body,KEY);assert.equal(f.dispatches,1);assert.equal(f.options.hostname,'mainnet.helius-rpc.com');assert.equal(f.options.servername,'mainnet.helius-rpc.com');assert.equal(f.options.port,443);assert.equal(f.options.method,'POST');assert.equal(f.options.rejectUnauthorized,true);assert.equal(f.options.minVersion,'TLSv1.2');assert.equal(f.options.maxHeaderSize,16384);assert.equal(f.options.agent,false);assert.equal(f.options.body,body);assert.equal(c.endpointHost,'mainnet.helius-rpc.com');assert.ok(!JSON.stringify(c).includes(KEY));
});
for(const kind of ['tls-unauthorized','sni-wrong','tls-old','cert-wrong','redirect','429','503','html','gzip','oversize','aborted','constructor-error','timeout'])test('private transport rejects '+kind+' without retry or secret-bearing failure',async()=>{const f=fixture(kind),keep=setInterval(()=>{},100);try{await assert.rejects(()=>f.wire('{}',KEY),e=>e.message==='native_pilot_held'&&!e.message.includes(KEY));assert.equal(f.dispatches,1);}finally{clearInterval(keep);}});
test('invalid key/body rejected before HTTPS',async()=>{const f=fixture('ok');assert.throws(()=>f.wire('{}','secret?injection'));assert.throws(()=>f.wire('x'.repeat(2049),KEY));assert.equal(f.dispatches,0);});
