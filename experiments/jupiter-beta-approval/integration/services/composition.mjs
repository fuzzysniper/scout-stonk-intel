// Concrete future wiring. Entry remains held and never constructs this with secrets.
import {setupAdmission} from '../setup-admission.mjs';
import {serial} from '../durable/serial.mjs';
import {context,policyBinding} from '../contract.mjs';
import {apiKeySdk} from '../sdk/requests.mjs';
import {boundedTransport} from '../sdk/transport.mjs';
import {configuration,StrictBetaClient} from '../durable/tls.mjs';
import {postgresLedger} from '../durable/postgres.mjs';
import {fileAnchor} from '../durable/anchor.mjs';
import {validatorComponent} from '../validator.mjs';
import {consumptionComponent} from '../authority.mjs';
import {handlers} from './handlers.mjs';
import {peer,remoteAnchor} from './peers.mjs';
import {serviceAuth} from './auth.mjs';
import {need} from '../json.mjs';
export async function assemble({role,setup,bindings,dispatch,clock=Date.now,withLock=serial()}){
 if(role==='control'){const validator=await assemble({role:'validator',setup,bindings,dispatch,clock,withLock}),authority=await assemble({role:'authority',setup,bindings,dispatch,clock,withLock});return (req,res)=>req.url==='/submit'?validator(req,res):authority(req,res);}
 const t=context(setup.publicTrust);setupAdmission(setup,t,clock());need(setup.recoveryAdmission==='independently-anchored-no-restore'&&setup.policyHash===policyBinding(t));
 const authorized=()=>{try{return setupAdmission(setup,t,clock());}catch{return false;}};
 const anchorAuth=serviceAuth(bindings.anchorKey,'anchor');
 if(role==='owner')return handlers({role,origin:t.ownerOrigin,publicTrust:t,clock,ready:authorized,anchor:fileAnchor({directory:setup.anchorDirectory,bootstrap:setup.anchorBootstrap}),anchorAuth,forward:(path,signed)=>peer(path==='/stop'?setup.authorityOrigin:setup.validatorOrigin,dispatch)(path,{signed})});
 if(role==='authority')need(!bindings.anchorKey.equals(bindings.consumerKey));
 const anchor=remoteAnchor(peer(t.ownerOrigin,dispatch),anchorAuth,clock);
 const ledgerFor=purpose=>postgresLedger({publicTrust:t,role:purpose,anchor,withLock,authorized,open:async()=>{const c=new StrictBetaClient(configuration(bindings.dsns[purpose],setup.neonDirectHost,bindings.neonCA));await c.connect();return c;}});
 if(role==='validator'){const sdk=await apiKeySdk(t,bindings.validatorCredential);return handlers({role,origin:setup.validatorOrigin,publicTrust:t,clock,ready:authorized,validator:validatorComponent({publicTrust:t,sdk,transport:boundedTransport(dispatch),ledger:ledgerFor('validator'),clock,authorized})});}
 need(role==='authority');return handlers({role,origin:setup.authorityOrigin,publicTrust:t,clock,ready:authorized,consumerAuth:serviceAuth(bindings.consumerKey,'consumer'),consumer:consumptionComponent({publicTrust:t,ledger:ledgerFor('consumer'),stopper:ledgerFor('stopper'),clock})});
}
