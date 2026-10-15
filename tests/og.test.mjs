import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {NextRequest}=require('next/server');
const ogModule=require.resolve('next/og');
const originalExports=require(ogModule),OriginalImageResponse=originalExports.ImageResponse;
let tree,rendererFails=false;
// Capture the actual React tree while still running Next's real Satori/PNG renderer.
class RecordingImageResponse extends OriginalImageResponse {
 constructor(element,options){super(element,options);tree=element;}
 async arrayBuffer(){if(rendererFails)throw Error('private renderer error');return super.arrayBuffer();}
}
require.cache[ogModule].exports={ImageResponse:RecordingImageResponse};
const {GET}=require(path.join(process.env.HISTORY_TEST_BUILD,'app/api/og/route.js'));
require.cache[ogModule].exports=originalExports;
const mint='DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP';
const other='Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh';
// Synthetic offline fixtures, not observations or investment results.
const at='2026-01-01T12:34:56.000Z';
const market=()=>({mint,found:true,base:{address:mint,symbol:'TEST'},quote:{address:other,symbol:'UNIT'},liquidityUsd:1234,fetchedAt:at});
const rewards=()=>({mint,status:'available',mode:'reward',quoteMint:other,quoteSymbol:'UNIT',distributedTokens:0,holderCount:4,fetchedAt:at});
const request=q=>new NextRequest('https://scout.example/api/og'+q);
function content(node){if(node===null || node===undefined || typeof node==='boolean')return '';if(typeof node!=='object')return String(node);if(Array.isArray(node))return node.map(content).join('');return content(node.props?.children);}
function allDivsFlex(node){if(!node || typeof node!=='object')return;if(Array.isArray(node)){node.forEach(allDivsFlex);return;}if(node.type==='div')assert.equal(node.props.style.display,'flex');allDivsFlex(node.props?.children);}
async function withSources(m,r,run){const original=globalThis.fetch,calls=[];globalThis.fetch=async(url,opts)=>{calls.push({url:String(url),opts});const value=String(url).includes('/api/token?')?m:r;if(value instanceof Error)throw value;if(value instanceof Response)return value;return Response.json(value);};try{return await run(calls);}finally{globalThis.fetch=original;rendererFails=false;}}
async function png(response){assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');assert.equal(response.headers.get('cache-control'),'public, max-age=60, s-maxage=60');assert.equal(response.headers.get('x-content-type-options'),'nosniff');const bytes=Buffer.from(await response.arrayBuffer());assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);assert.equal(bytes.toString('ascii',12,16),'IHDR');assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),630);assert.ok(bytes.includes(Buffer.from('IDAT')));assert.equal(bytes.toString('ascii',bytes.length-8,bytes.length-4),'IEND');allDivsFlex(tree);return content(tree);}
test('OG rejects invalid, duplicate and unsupported parameters before any source fetch',async()=>withSources(market(),rewards(),async calls=>{for(const q of ['', '?mint=invalid','?mint='+mint+'&mint='+mint,'?mint='+mint+'&url=https://evil.example']){const r=await GET(request(q));assert.equal(r.status,400);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(await r.text(),'Invalid mint');}assert.equal(calls.length,0);}));
test('OG real renderer emits a PNG, source times and exact token identity with bounded same-origin GETs',async()=>withSources(market(),rewards(),async calls=>{const text=await png(await GET(request('?mint='+mint)));assert.match(text,/TEST/);assert.match(text,/0 UNIT/);assert.ok(text.includes('Mint: '+mint));assert.ok(text.includes('2026-01-01 12:34 UTC'));assert.match(text,/Not holder profit or APR/);assert.doesNotMatch(text,/Eligible holders|◉/);assert.equal(calls.length,2);for(const {url,opts} of calls){assert.equal(new URL(url).origin,'https://scout.example');assert.equal(new URL(url).searchParams.get('mint'),mint);assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');assert.equal(opts.cache,'no-store');assert.ok(opts.signal instanceof AbortSignal);}}));
test('OG quote-side pool uses the requested token symbol rather than another base token',async()=>withSources({...market(),base:{address:other,symbol:'OTHER'},quote:{address:mint,symbol:'REQUESTED'}},new Error('outage'),async()=>{const text=await png(await GET(request('?mint='+mint)));assert.match(text,/REQUESTED/);assert.match(text,/Reward source unavailable/);assert.match(text,/Not available/);}));
test('OG does not borrow mismatched source identities or manufacture zero rewards',async()=>withSources({...market(),mint:other},{...rewards(),mint:other},async()=>{const r=await GET(request('?mint='+mint));assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('retry-after'),'60');assert.doesNotMatch(await r.text(),/private/);}));
test('OG unknown token has an honest identity-only PNG, not a fictitious source observation',async()=>withSources({mint,found:false,fetchedAt:at},{status:'not_found',fetchedAt:at},async()=>{const text=await png(await GET(request('?mint='+mint)));assert.match(text,/TOKEN/);assert.match(text,/Not available/);assert.match(text,/Market source unavailable/);assert.match(text,/Reward source unavailable/);assert.ok(text.includes(mint));assert.ok(!text.includes(at.slice(0,10)));}));
test('OG reward mode, amount and unit gates preserve unavailable and reject unsafe holder counts',async()=>{for(const r of [{...rewards(),mode:'burn'},{...rewards(),quoteMint:'invalid'},{...rewards(),distributedTokens:null,holderCount:1.5},{...rewards(),distributedTokens:-1,holderCount:Number.MAX_SAFE_INTEGER+1},{...rewards(),distributedTokens:Infinity,holderCount:null}])await withSources(market(),r,async()=>{const text=await png(await GET(request('?mint='+mint)));assert.match(text,/Not available/);assert.ok(!text.includes('Provider holder count: 4'));});});
test('OG unsupported labels avoid remote font fetches and future/invalid times remain unknown',async()=>withSources({...market(),base:{address:mint,symbol:'令牌'},fetchedAt:'not a timestamp'},{...rewards(),quoteSymbol:'令牌',fetchedAt:'2999-01-01T00:00:00Z'},async calls=>{const text=await png(await GET(request('?mint='+mint)));assert.match(text,/TOKEN/);assert.match(text,/Not available/);assert.match(text,/time unavailable/);assert.doesNotMatch(text,/令牌|2999/);assert.equal(calls.length,2);}));
test('OG provider errors, malformed/oversized bodies and rendering stream failures return sanitized noncached 503',async()=>{for(const [m,r,fail] of [[new Error('private provider error'),new Error('secret'),false],[new Response('{bad'),new Response('[]'),false],[new Response(' '.repeat(65537)),new Error('outage'),false],[market(),rewards(),true]])await withSources(m,r,async()=>{rendererFails=fail;const response=await GET(request('?mint='+mint));assert.equal(response.status,503);assert.match(response.headers.get('content-type'),/^text\/plain/);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('retry-after'),'60');assert.equal(await response.text(),'Social preview temporarily unavailable');});});

test('OG controlled outage and renderer failure are complete HTTP 503 responses and recover to PNG',async()=>{
 const {createServer,get}=await import('node:http');
 let outage=true;
 const original=globalThis.fetch;
 globalThis.fetch=async url=>{if(outage)throw Error('private outage detail');return Response.json(String(url).includes('/api/token?')?market():rewards());};
 const server=createServer(async(req,res)=>{try{const response=await GET(new NextRequest('http://127.0.0.1'+req.url));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(error){res.destroy(error);}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const receive=()=>new Promise((resolve,reject)=>get({hostname:'127.0.0.1',port:server.address().port,path:'/api/og?mint='+mint},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));res.on('error',reject);}).on('error',reject));
 try{
  for(const renderer of [false,true]){
   outage=!renderer;rendererFails=renderer;
   const response=await receive();assert.equal(response.status,503);assert.equal(response.headers['cache-control'],'no-store');assert.equal(response.headers['retry-after'],'60');assert.match(response.headers['content-type'],/^text\/plain/);assert.equal(response.body.toString(),'Social preview temporarily unavailable');
  }
  outage=false;rendererFails=false;const response=await receive();assert.equal(response.status,200);assert.equal(response.headers['content-type'],'image/png');assert.deepEqual([...response.body.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 }finally{globalThis.fetch=original;rendererFails=false;await new Promise(resolve=>server.close(resolve));}
});
