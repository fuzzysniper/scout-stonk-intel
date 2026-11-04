// ACTUAL new-branch page + route. Positive trap control prevents unrelated denial PASS.
import test from 'node:test';import assert from 'node:assert/strict';import Module,{createRequire} from 'node:module';
const require=createRequire(import.meta.url),original=Module._load,priorFetch=globalThis.fetch,root=process.env.NATIVE_LENS_BUILD;let loads=[],network=0;
Module._load=function(name,...args){loads.push(name);if(name==='react')return original.call(this,process.cwd()+'/node_modules/react/react.react-server.js',...args);if(name==='react/jsx-runtime')return original.call(this,process.cwd()+'/node_modules/react/jsx-runtime.react-server.js',...args);if(/\.css$/.test(name))return {};if(/(?:^|\/)(?:pg(?:-[^/]*)?|better-auth|@better-auth|@turnkey)(?:\/|$)|native-tls\.mjs|private-development|jupiter-beta-admission|native-lens\/boundary|native-pilot\/index/.test(name))throw Error('FORBIDDEN_BOOTSTRAP');return original.call(this,name,...args);};globalThis.fetch=async()=>{network++;throw Error('NO_EXTERNAL_OR_LOCAL_SOURCE');};
const page=require(root+'/app/lens/page.js'),route=require(root+'/app/api/native-pilot/route.js');
test.after(()=>{Module._load=original;globalThis.fetch=priorFetch;});
test('new exact corrective branch renders existing native lens before Jupiter/owner/DB/bootstrap import',async()=>{
 const previous=process.env;process.env={...previous,VERCEL_GIT_COMMIT_REF:'integration/284-native-corrections'};try{loads=[];assert.ok(await page.default());assert.equal(network,0);assert.ok(!loads.some(x=>/private-development|jupiter-beta|native-pilot/.test(x)));}finally{process.env=previous;}
});
test('known legacy import is the positive control for the bootstrap trap, not a silently unused trap',async()=>{
 const previous=process.env;process.env={...previous,VERCEL_GIT_COMMIT_REF:'integration/271-oracle-native-source-reviewed'};try{await assert.rejects(page.default(),/FORBIDDEN_BOOTSTRAP/);assert.throws(()=>require('pg'),/FORBIDDEN_BOOTSTRAP/);}finally{process.env=previous;}
});
test('HARD-OFF default rejects source/owner/old grants, POST+GET before body or secret access on the new branch',async()=>{
 const previous=process.env,reads=[];process.env=new Proxy({...previous,VERCEL_GIT_COMMIT_REF:'integration/284-native-corrections',NATIVE_LENS_SOURCE_ENABLED:'true',NATIVE_PILOT_ENABLED:'true'},{get(t,k){if(/SECRET|PASSWORD|DATABASE_URL|_DSN|API_KEY|PRIVATE_KEY/.test(String(k))){reads.push(k);throw Error('NO_SECRET_ACCESS');}return t[k];}});
 try{for(const extra of [{},{cookie:'SYNTHETIC_NOT_AN_OWNER'},{'x-unfarmd-jupiter-research':'3'},{'x-unfarmd-jupiter-admission':'SYNTHETIC_OLD_V1'},{'x-owner-authenticated':'true'},{'x-unfarmd-native-approval':'SYNTHETIC_OLD_SIGNED_LANE'}]){
  const req=new Request('https://synthetic.invalid/api/native-pilot',{method:'POST',headers:{...extra,'x-unfarmd-native-intent':'inspect'},body:'SYNTHETIC_NOT_AUTHORITY'});Object.defineProperty(req,'body',{get(){throw Error('NO_BODY_READ');}});const r=await route.POST(req);assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'native_pilot_off'});assert.equal(r.headers.get('cache-control'),'private, no-store');
 }assert.equal((await route.GET()).status,503);assert.deepEqual(reads,[]);assert.equal(network,0);}finally{process.env=previous;}
});
