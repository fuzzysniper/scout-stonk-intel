// Private classes only. This module alone has no fetch/scheduled/alarm handler,
// SLOTS binding, collector, Git client or installation token with write access.
import { DurableObject, WorkflowEntrypoint } from 'cloudflare:workers';
import {inspectHostedApp,permitted,receipt,SINGLETON,WORKFLOW} from './app-proof.mjs';

export class StageC2ProofOnce extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.state=ctx;this.config=env;
  ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS c2_once(id INTEGER PRIMARY KEY CHECK(id=1), started_at INTEGER NOT NULL, receipt TEXT)');}
 async prove(event){
  const failed=receipt(event?.instanceId);
  try{
   if(!permitted(this.config,event))return failed;
   // Durable reservation before key access or token issuance; NEVER released.
   // No TTL/reset/delete operation, including after crash, timeout or bad key.
   const first=this.state.storage.transactionSync(()=>{
    if([...this.state.storage.sql.exec('SELECT id FROM c2_once')].length)return false;
    this.state.storage.sql.exec('INSERT INTO c2_once(id,started_at) VALUES(1,?)',Date.now());return true;
   });
   if(!first)return failed;
   // Project only the auth capability. SLOTS and Workflow/other bindings are not read.
   const config=this.config;
   const narrow={ACTIVATION:config.ACTIVATION,APP_ID:config.APP_ID,INSTALLATION_ID:config.INSTALLATION_ID,REPOSITORY_ID:config.REPOSITORY_ID,
    C2_ARMED:config.C2_ARMED,C2_GATE_DISABLED_ATTESTED:config.C2_GATE_DISABLED_ATTESTED,C2_APP_ACTOR_ID:config.C2_APP_ACTOR_ID,
    C2_INSTANCE_ID:config.C2_INSTANCE_ID,C2_NOT_BEFORE:config.C2_NOT_BEFORE,C2_EXPIRES_AT:config.C2_EXPIRES_AT,
    get APP_PRIVATE_KEY(){return config.APP_PRIVATE_KEY;}};
   const result=await inspectHostedApp(narrow,event);
   this.state.storage.sql.exec('UPDATE c2_once SET receipt=? WHERE id=1',JSON.stringify(result));
   return result;
  }catch{return failed;}
 }
}
export class StageC2AuthProof extends WorkflowEntrypoint {
 async run(event,step){
  try{
   if(event.schedule!==undefined || !event.payload || typeof event.payload!=='object' || Array.isArray(event.payload) || Object.keys(event.payload).length) return receipt();
   const input={instanceId:event.instanceId,workflowName:event.workflowName,createdAt:event.timestamp?.getTime()};
   if(input.workflowName!==WORKFLOW || !permitted(this.env,input))return receipt(input.instanceId);
   return await step.do('one-private-auth-proof',{retries:{limit:0,delay:'1 second'},timeout:'1 minute'},async()=>{
    const stub=this.env.C2_ONCE.get(this.env.C2_ONCE.idFromName(SINGLETON));
    return stub.prove(input);
   });
  }catch{return receipt();}
 }
}

// Explicit empty default prevents a no-default service forwarding an HTTP probe.
const privateService={};
export default privateService;
