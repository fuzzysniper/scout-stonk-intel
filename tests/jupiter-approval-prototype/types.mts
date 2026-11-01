import {verifyEnvelope,MODE,type PublicTrust} from '../../experiments/jupiter-beta-approval/protocol.mjs';
import {localLedger} from '../../experiments/jupiter-beta-approval/local-ledger.mjs';
import {researchConsumer} from '../../experiments/jupiter-beta-approval/validator.mjs';
declare const context:PublicTrust;
const answer=verifyEnvelope('TEST',context,0);
const mode:'synthetic-only'=MODE;
const activation:false=answer.activate;
const source:false=answer.sourceCalls;
// @ts-expect-error No prototype outcome can authorize activation.
const live:true=answer.activate;
// @ts-expect-error No prototype outcome can authorize a provider request.
const fetchAllowed:true=answer.sourceCalls;
if(answer.status==='verified_simulation_only'){
 const stillOff:false=answer.record.activate;
 const noNative:false=answer.record.scope.native;
 void [stillOff,noNative];
}
void [mode,activation,source,live,fetchAllowed];
const store=localLedger(),consumer=researchConsumer({context,ledger:store.consumer,clock:()=>0});
// @ts-expect-error The research consumer cannot issue permissions.
consumer.approve({});
// @ts-expect-error The validator port cannot administer signing keys.
store.issuer.revokeKey('test_beta',1);
// @ts-expect-error The research port cannot renew or reset the local budget.
store.consumer.reset();
