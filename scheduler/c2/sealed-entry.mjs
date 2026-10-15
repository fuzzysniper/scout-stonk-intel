// FUTURE ROLLBACK ONLY. Preserve both namespace/class identities and old receipts.
// No new proof, key read, auth, alarm or state write; production exports unchanged.
import {DurableObject,WorkflowEntrypoint} from 'cloudflare:workers';
import {receipt} from './app-proof.mjs';
export {default,SlotCoordinator} from '../staging-entry.ts';
export class StageC2ProofOnce extends DurableObject {
 async prove(){return receipt();}
}
export class StageC2AuthProof extends WorkflowEntrypoint {
 async run(_event,step){return step.do('sealed-no-auth',{retries:{limit:0,delay:'1 second'},timeout:'1 minute'},()=>receipt());}
}
