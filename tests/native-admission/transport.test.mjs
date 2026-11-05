// SYNTHETIC request/response transcripts only. No actual GitHub TLS, approval, credentials or calls.
import test from 'node:test';import assert from 'node:assert/strict';import https from 'node:https';import {EventEmitter} from 'node:events';
import {fixture,load} from './fixtures.mjs';
const {githubReader,listingPath}=load('github');
async function transcript(mode){
 const original=https.request,f=fixture(),options=[];let attempts=0;
 https.request=(o,callback)=>{options.push(o);attempts++;const q=new EventEmitter();q.destroy=()=>{q.destroyed=true;};
  q.end=()=>queueMicrotask(()=>{
   if(mode==='throw'){q.emit('error',Error('SYNTHETIC_TOKEN_MUST_NOT_ESCAPE'));return;}
   const socket=new EventEmitter();Object.assign(socket,{encrypted:true,authorized:mode!=='tls',servername:'api.github.com',getProtocol:()=> 'TLSv1.3',getPeerCertificate:()=>({subjectaltname:'DNS:api.github.com',subject:{CN:'api.github.com'}})});q.emit('socket',socket);socket.emit('secureConnect');if(q.destroyed||mode==='timeout')return;
   const r=new EventEmitter();Object.assign(r,{statusCode:mode==='429'?429:mode==='503'?503:mode==='redirect'?302:200,headers:{'content-type':'application/json',...(mode==='pagination'?{link:'NEXT'}:{}),...(mode==='encoding'?{'content-encoding':'gzip'}:{})},complete:true,destroy(){this.destroyed=true;}});callback(r);if(r.destroyed)return;
   const body=mode==='oversize'?'x'.repeat(65537):mode==='duplicate'?'[{"id":1,"id":2}]':mode==='malformed'?'no JSON':'[]';r.emit('data',Buffer.from(body));if(!r.destroyed)r.emit('end');
  });return q;};
 try{const read=githubReader('SYNTHETIC_READ_ONLY_GITHUB_TOKEN_000',new AbortController().signal);if(mode==='ok')assert.deepEqual(await read(listingPath('setup',f.context)),[]);else await assert.rejects(()=>read(listingPath('setup',f.context)),e=>e.message==='native_pilot_held');
  assert.equal(attempts,1);assert.equal(options[0].method,'GET');assert.equal(options[0].hostname,'api.github.com');assert.equal(options[0].servername,'api.github.com');assert.equal(options[0].port,443);assert.equal(options[0].rejectUnauthorized,true);assert.equal(options[0].agent,false);assert.equal(options[0].headers['accept-encoding'],'identity');
 }finally{https.request=original;}
}
for(const mode of ['ok','throw','tls','429','503','redirect','pagination','encoding','oversize','duplicate','malformed','timeout'])test('SYNTHETIC bounded fixed GitHub reader '+mode+' without retry or secret error',()=>transcript(mode));
