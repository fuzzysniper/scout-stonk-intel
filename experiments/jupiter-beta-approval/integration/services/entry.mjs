// Independently startable owner / validator / authority role. NO live composition.
import http from 'node:http';
import release from '../release.json' with {type:'json'};
import {context} from '../contract.mjs';
import {setupAdmission} from '../setup-admission.mjs';
import {assemble} from './composition.mjs';
import {loadBindings} from './bindings.mjs';
import {handlers} from './handlers.mjs';
const role=process.argv[2];if(!['owner','validator','authority','control'].includes(role))throw Error('role_required');
if(release.acquisitionEnabled!==false)throw Error('acquisition_not_implemented');
const configured=release.externalCallsEnabled===true&&release.databaseEnabled===true&&release.trustEnrolled===true&&release.publicTrust!==null&&release.setup!==undefined;
// Only a public listening port is read. No secret/config fetch, SDK stamp or SQL path.
const port=process.env.PORT===undefined?3901:Number(process.env.PORT);if(!Number.isInteger(port)||port<1||port>65535)throw Error('port_invalid');
const origin=process.env.RENDER_EXTERNAL_URL||'http://127.0.0.1:'+port;if(new URL(origin).origin!==origin)throw Error('origin_invalid');
if(configured){const t=context(release.setup.publicTrust);setupAdmission(release.setup,t,Date.now());if(origin!==(role==='owner'?t.ownerOrigin:role==='validator'?release.setup.validatorOrigin:release.setup.authorityOrigin))throw Error('runtime_origin_mismatch');}
const handler=configured?await assemble({role,setup:release.setup,bindings:loadBindings(role,process.env),dispatch:(url,init)=>fetch(url,init)}):handlers({role:role==='control'?'validator':role,origin,ready:()=>false});
const s=http.createServer(handler);s.requestTimeout=1000;s.headersTimeout=1000;s.maxHeadersCount=32;
s.listen(port,'0.0.0.0',()=>console.log(JSON.stringify({role,status:configured?'configured_source_off':'setup_held',activate:false,sourceCalls:false})));
