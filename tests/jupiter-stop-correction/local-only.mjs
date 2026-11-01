// Import only INSIDE the disposable namespace. No hosted DNS/HTTP/TCP is allowed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import dns from 'node:dns';
import {syncBuiltinESMExports} from 'node:module';
assert.equal(process.env.UNFARMD_BETA_LOCAL_PG,'isolated-synthetic-only');
assert.deepEqual(Object.keys(os.networkInterfaces()),['lo'],'requires network namespace, no external interface');
assert.equal(fs.readFileSync('/proc/net/route','utf8').trim().split('\n').length,1,'no external routes');
export const HOST='ep-beta-local-test.c-6.us-east-2.aws.neon.tech';
const lookup=dns.lookup;
dns.lookup=function(host,options,callback){
 if(typeof options==='function'){callback=options;options={};}
 if(host===HOST){const all=typeof options==='object'&&options?.all;return queueMicrotask(()=>all?callback(null,[{address:'127.0.0.1',family:4}]):callback(null,'127.0.0.1',4));}
 if(host==='127.0.0.1'||host==='::1'||host==='localhost')return lookup.call(this,host,options,callback);
 throw Error('test_external_dns_forbidden');
};
const connect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){
 const first=Array.isArray(args[0])?args[0][0]:args[0];
 const options=typeof first==='object'?first:{port:first,host:args[1]};
 if(options.path||typeof first==='string'&&!/^\d+$/.test(first)){
  assert.match(options.path??first,/^\/tmp\/unfarmd-beta-pg18-[A-Za-z0-9]+\//,'only fresh harness sockets');
 }else assert.ok([HOST,'127.0.0.1','::1','localhost'].includes(options.host??'localhost'),'test_external_tcp_forbidden');
 return connect.apply(this,args);
};
syncBuiltinESMExports();
