// Cross-PROCESS synthetic contender. Parent IPC supplies ONLY local test config/policy/anchor.
import './namespace-only.mjs';import {requireLocalPg18Approval} from './pg18-approval.mjs';requireLocalPg18Approval();
import {Pool} from 'pg';import {StrictJournalClient,strictBindingEstablished} from '../../ops/v4-journal/native-tls.mjs';
import {fileAnchor} from '../../experiments/jupiter-beta-approval/integration/durable/anchor.mjs';
import {load,H} from './fixtures.mjs';
const {transaction,PROOF,checkProof}=load('connection'),{postgresProtocol,seed}=load('protocol');
process.send({ready:true});process.once('message',async({config,policy,directory})=>{
 let pool;try{
  if(config.host!=='localhost'||!Number.isInteger(config.port)||config.port<1024||config.user!=='unfarmd_native_login'||config.database!=='unfarmd_v4_pilot')throw Error('nonlocal_test_endpoint_denied');
  pool=new Pool({...config,Client:StrictJournalClient,max:1});pool.on('error',()=>{});
  const initial=seed(policy),a=fileAnchor({directory,bootstrap:initial.checkpoint}),anchor={current:()=>a.current(),async advance(x,y){await a.advance(x,y);return a.current();}};
  const tx=transaction(pool,initial.checkpoint.policyHash,async c=>{if(!strictBindingEstablished(c))throw Error('binding_required');checkProof((await c.query(PROOF)).rows[0]);});
  const l=postgresProtocol(policy,(op,input)=>tx(op,{...input,durability:{mode:'local-fsync'}}),anchor);
  const r=await l.reserve('getTokenLargestAccounts',H,Date.now());process.send({status:r.status,attempts:r.state.attempts,stopped:r.state.stopped});
 }catch{process.send({status:'held'});}finally{await pool?.end();process.disconnect();}
});
