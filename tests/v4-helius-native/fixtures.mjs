// INVENTED LOCAL TLS DATA, NOT HELIUS OBSERVATIONS. No real credentials or source calls.
import {createRequire} from 'node:module';import {createServer,request as httpsRequest} from 'node:https';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
export {fixture,request,cookie,MINTS,OWNER,OTHER_OWNER,HOST,ORIGIN,SESSION,TOKEN} from '../v4-owner-ledger/fixtures.mjs';
export {envelope,token2022,TOKEN2022,info} from '../v4-solana-facts/fixtures.mjs';
export const require=createRequire(import.meta.url),build=process.env.V4_NATIVE_BUILD;
export const {createLocalFixtureProducer}=require(build+'/lib/v4-helius-native/testing.js');
export const {createHeliusNative,NATIVE_SOURCE}=require(build+'/lib/v4-helius-native/index.js');
export const {prepareProducer}=require(build+'/lib/v4-helius-native/producer.js');
export const {unselectedNativeBinding,localFixtureBinding}=require(build+'/lib/v4-helius-native/transport.js');
export const {createPostgresPilotLedger}=require(build+'/lib/v4-owner-ledger/ledger.js');
export const KEY='SYNTHETIC_LOCAL_ONLY_232_NO_PROVIDER_KEY';
export async function tlsFixture(){
 const dir=mkdtempSync(join(tmpdir(),'v4-native-tls-'));
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(dir,'local.key'),'-out',join(dir,'local.crt'),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost'],{stdio:'ignore'});
 const cert=readFileSync(join(dir,'local.crt')),sockets=new Set();
 const f={hits:0,seen:[],handler:()=>{throw Error('fixture not initialized');}};
 const server=createServer({key:readFileSync(join(dir,'local.key')),cert},(req,res)=>{
   f.hits++;let text='';req.on('data',b=>text+=b);req.on('end',()=>{f.seen.push({path:req.url,method:req.method,headers:req.headers,text});f.handler(req,res,JSON.parse(text));});
 });server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});server.on('tlsClientError',()=>{});
 await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});
 const port=server.address().port;
 f.wire=(options,cb)=>{
  assert.equal(options.hostname,'mainnet.helius-rpc.com');assert.equal(options.servername,'mainnet.helius-rpc.com');assert.equal(options.port,443);assert.equal(options.protocol,'https:');assert.equal(options.rejectUnauthorized,true);assert.equal(options.minVersion,'TLSv1.2');assert.equal(options.agent,false);assert.equal(options.maxHeaderSize,16384);assert.equal(options.insecureHTTPParser,false);
  return httpsRequest({...options,hostname:'127.0.0.1',port,servername:'localhost',ca:cert},cb);
 };
 f.untrusted=(options,cb)=>httpsRequest({...options,hostname:'127.0.0.1',port,servername:'localhost'},cb);
 f.wrongName=(options,cb)=>httpsRequest({...options,hostname:'127.0.0.1',port,servername:'wrong.invalid',ca:cert},cb);
 f.reset=()=>{f.hits=0;f.seen=[];};
 f.close=async()=>{for(const s of sockets)s.destroy();await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});};return f;
}
