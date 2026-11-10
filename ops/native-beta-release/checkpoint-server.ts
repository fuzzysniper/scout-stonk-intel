/** UNINSTALLED independent-host entry; default OFF before any key/port/disk access.
 * Build/package separately with the reviewed compiler and exact source identity.
 * Not imported by Next, never hosted in Vercel/tmp or a Neon restore target. */
import fs from 'node:fs';import {createServer} from 'node:http';
import {createNativeCheckpointEndpoint} from '../../lib/native-pilot/runtime/custodian';
import type {Custody} from '../../lib/native-pilot/postgres/checkpoint';
import type {AnchorBootstrap} from '../../lib/native-pilot/ledger';
import {need} from '../../lib/native-pilot/plan';
async function main(){
 const install=JSON.parse(fs.readFileSync('ops/native-beta-release/checkpoint-installation.json','utf8'));
 need(Object.keys(install).sort().join(',')==='configuration,mode,version'&&install.version==='native-checkpoint-installation/1');
 if(install.mode==='off'&&install.configuration===null)return;
 need(install.mode==='installed'&&process.argv.slice(2).join(' ')==='--serve');
 const c=install.configuration as {custody:Custody;directory:string;bootstrap:AnchorBootstrap;resourceId:string;diskId:string};
 need(c&&Object.keys(c).sort().join(',')==='bootstrap,custody,directory,diskId,resourceId'&&/^[a-zA-Z0-9_-]{8,128}$/.test(c.resourceId)&&/^[a-zA-Z0-9_-]{8,128}$/.test(c.diskId));
 const keyText=process.env.UNFARMD_NATIVE_CHECKPOINT_KEY;need(keyText);const key=Buffer.from(keyText,'base64url');need(key.toString('base64url')===keyText);
 const handler=createNativeCheckpointEndpoint(c.custody,key,c.directory,c.bootstrap),origin=new URL(c.custody.origin),port=Number(process.env.PORT);need(Number.isInteger(port)&&port>0&&port<65536);
 createServer(async(req,res)=>{try{
  // Platform TLS termination; MAC still authenticates every request. No proxy URL selection.
  need(req.headers.host===origin.host&&req.headers['x-forwarded-proto']==='https'&&req.method==='POST');
  const controller=new AbortController();req.on('aborted',()=>controller.abort());const headers=new Headers();for(const[k,v]of Object.entries(req.headers)){need(!Array.isArray(v));if(v!==undefined)headers.set(k,v);}
  const body=new ReadableStream<Uint8Array>({start(stream){req.on('data',chunk=>stream.enqueue(chunk));req.once('end',()=>stream.close());req.once('error',error=>stream.error(error));},cancel(){req.destroy();}});
  const request=new Request(c.custody.origin+(req.url??''),{method:'POST',headers,body,signal:controller.signal,duplex:'half'} as RequestInit),response=await handler(request);
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(503,{'Cache-Control':'private, no-store'});res.end('{"error":"native_checkpoint_held"}');}}).listen(port,'0.0.0.0');
}
main().catch(()=>{process.stderr.write('NATIVE_CHECKPOINT_HOLD: no repair or retry authorized.\n');process.exitCode=1;});
