// Fixed B-owned #172 seam. No production-enable, Helius key, v1 or in-memory fallback.
import {nativeStore,LedgerError} from '../scout-continuous/database.mjs';
export function createContinuousStore(){
 const env=process.env;
 if(env.SCOUT_CONTINUOUS_STORE_ENABLED!=='true')throw new LedgerError('store_disabled');
 if(env.RENDER!=='true'||env.UNFARMD_DATA_ACTIVATION!=='disabled'||env.RENDER_SERVICE_ID!==env.SCOUT_LIVE_RENDER_SERVICE_ID||!/^srv-[a-z0-9]+$/.test(env.RENDER_SERVICE_ID??'')||!/^[a-f0-9]{40}$/.test(env.RENDER_GIT_COMMIT??''))throw new LedgerError('invalid_runtime');
 const store=nativeStore('worker',env);
 return Object.freeze({version:store.version,transact(command,options){if(command?.head!==env.RENDER_GIT_COMMIT)throw new LedgerError('invalid_runtime');return store.transact(command,options);},close:()=>store.close()});
}
