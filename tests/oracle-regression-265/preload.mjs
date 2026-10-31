// Local optimized-app test process ONLY. Injects invented data; never native/provider evidence.
import Module from 'node:module';
import {sourceResponse,SOL,USDC,MISSING} from './fixtures.mjs';
if(process.env.ORACLE_265_LOCAL_FIXTURE!=='1')throw Error('LOCAL_TEST_ONLY');
const original=Module._load;
Module._load=function(spec,...args){if(/(?:^|\/)(?:pg(?:-[^/]*)?|better-auth|@better-auth|native-tls\.mjs)(?:\/|$)|native-mint\/producer/.test(spec))throw Error('FORBIDDEN_INACTIVE_STACK');return original.call(this,spec,...args);};
const guardedFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{const u=new URL(typeof input==='string'||input instanceof URL?input:input.url);if(['127.0.0.1','localhost','[::1]'].includes(u.hostname))return guardedFetch(input,init);
 if(u.origin!=='https://api.jup.ag'||u.pathname!=='/tokens/v2/search'||u.searchParams.size!==1||![SOL,USDC,MISSING].includes(u.searchParams.get('query'))||init?.method!=='GET'||init?.redirect!=='error'||init?.cache!=='no-store'||init?.credentials!=='omit')throw Error('NONLOCAL_TEST_REQUEST_BLOCKED');
 process.stdout.write('SYNTHETIC_PROVIDER_FIXTURE_CALL\n');return sourceResponse(u.searchParams.get('query'));};
